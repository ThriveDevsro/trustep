import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { analyzeContentRisk } from "./content-risk";
import type { AnalysisResult } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_FRAUD_MODEL = "qwen/qwen3.6-27b";

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey || apiKey.startsWith("your_")) {
    throw new Error(
      "AI analýza nie je nakonfigurovaná. Nastavte GROQ_API_KEY.",
    );
  }

  return new Groq({ apiKey });
}

function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey || apiKey.startsWith("your_")) return null;

  return new OpenAI({ apiKey });
}

interface ImageFraudSignals {
  visibleText: string;
  contextSummary: string;
  suspiciousVisualSignals: string[];
}

function parseJsonObject<T>(content: string): T {
  const normalized = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const objectStart = normalized.indexOf("{");
  let objectEnd = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = objectStart; index >= 0 && index < normalized.length; index += 1) {
    const character = normalized[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = index;
        break;
      }
    }
  }

  const json =
    objectStart >= 0 && objectEnd > objectStart
      ? normalized.slice(objectStart, objectEnd + 1)
      : normalized;

  return JSON.parse(json) as T;
}

interface ModelFraudFinding {
  evidence: string;
  explanation: string;
}

interface ModelFraudAnalysis {
  riskLevel: "low" | "medium" | "high";
  claimedIdentity: string;
  requestedAction: string;
  identityConsistency: string;
  socialEngineeringSignals: string[];
  technicalSignals: string[];
  findings: ModelFraudFinding[];
  recommendation: string;
}

function normalizeOcrText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getImageExtension(mimeType: string): string {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("heic")) return ".heic";
  if (mimeType.includes("heif")) return ".heif";
  return ".img";
}

async function runTesseract(inputPath: string, outputBase: string) {
  const candidates = [
    process.env.TESSERACT_PATH,
    "/opt/homebrew/bin/tesseract",
    "tesseract",
  ].filter(Boolean) as string[];

  let lastError: unknown = null;

  for (const command of candidates) {
    try {
      await execFileAsync(command, [
        inputPath,
        outputBase,
        "-l",
        "eng",
        "--psm",
        "6",
        "txt",
      ]);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Lokálny OCR engine Tesseract sa nepodarilo spustiť.");
}

async function extractTextWithLocalOcr(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  const workingDir = await mkdtemp(join(tmpdir(), "truststep-ocr-"));
  const inputPath = join(workingDir, `input${getImageExtension(mimeType)}`);
  const outputBase = join(workingDir, "ocr-output");

  try {
    await writeFile(inputPath, imageBuffer);
    await runTesseract(inputPath, outputBase);
    const rawText = await readFile(`${outputBase}.txt`, "utf8");
    return normalizeOcrText(rawText);
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

function inferContextFromText(text: string): string {
  const normalized = text.toLowerCase();

  if (
    /(subject:|from:|reply-to:|unsubscribe|doručená pošta|inbox)/i.test(
      normalized,
    )
  ) {
    return "Screenshot e-mailu alebo poštového klienta.";
  }

  if (/(whatsapp|messenger|telegram|chat|správa|message)/i.test(normalized)) {
    return "Screenshot chatovej alebo messaging komunikácie.";
  }

  if (
    /(facebook|instagram|sponsored|reklama|advertisement|marketplace)/i.test(
      normalized,
    )
  ) {
    return "Screenshot sociálnej siete, reklamy alebo marketplace ponuky.";
  }

  if (/(iban|faktúra|invoice|payment|platba|prevod|účet)/i.test(normalized)) {
    return "Screenshot platobnej výzvy, faktúry alebo bankovej komunikácie.";
  }

  if (
    /(login|sign in|prihlás|password|heslo|verification code|otp)/i.test(
      normalized,
    )
  ) {
    return "Screenshot prihlasovacej alebo verifikačnej výzvy.";
  }

  return "Screenshot digitálnej komunikácie alebo webového obsahu.";
}

function inferSuspiciousSignalsFromText(text: string): string[] {
  const normalized = text.toLowerCase();
  const signals: string[] = [];

  if (
    /(urgent|urgentne|urgentný|okamžite|hneď|ihneď|limited time|posledná šanca)/i.test(
      normalized,
    )
  ) {
    signals.push("urgentný jazyk alebo tlak na rýchlu reakciu");
  }

  if (
    /(click|klikn|link|odkaz|verify|overte|confirm|potvrďte|login|prihlás)/i.test(
      normalized,
    )
  ) {
    signals.push("výzva na kliknutie, overenie alebo prihlásenie");
  }

  if (
    /(iban|wallet|crypto|bitcoin|deposit|platba|prevod|bank transfer|investment|invest)/i.test(
      normalized,
    )
  ) {
    signals.push("výzva na platbu, investovanie alebo prevod peňazí");
  }

  if (
    /(password|heslo|otp|kód|kod|cvv|card|občiansk|rodné číslo|personal data)/i.test(
      normalized,
    )
  ) {
    signals.push("žiadosť o citlivé údaje alebo prístupové informácie");
  }

  if (
    /(premiér|prezident|minister|politik|celebrity|známa osobnosť|public figure)/i.test(
      normalized,
    )
  ) {
    signals.push("zmienka o verejnej osobe alebo autorite");
  }

  if (
    /(garantovan|zaručen|profit|výnos|returns?|giveaway|vyhraj|zdvojnásob)/i.test(
      normalized,
    )
  ) {
    signals.push("príliš výhodná alebo manipulatívna ponuka");
  }

  return signals;
}

export async function analyzeForFraud(
  text: string,
): Promise<ModelFraudAnalysis> {
  const groq = getGroqClient();
  const model = process.env.GROQ_FRAUD_MODEL?.trim() || DEFAULT_FRAUD_MODEL;
  const systemPrompt =
    "Si analytický engine FEELSODD pre overovanie vydávania sa za inú osobu alebo organizáciu a sociálneho inžinierstva. Odpovedáš na otázku: Je to naozaj ten, za koho sa odosielateľ vydáva, a je bezpečné konať podľa jeho požiadavky? Analyzuješ päť vrstiev: tvrdenú identitu, požadovanú akciu, zhodu identity, sociálne inžinierstvo a technické signály. Samotná platba, IBAN, značka alebo odkaz NIE SÚ dôkaz podvodu. Nikdy nevymýšľaj identitu, doménu, vlastníctvo ani oficiálny kontakt. Ak údaj v obsahu nie je, jasne povedz, že sa nedá určiť alebo potvrdiť. Nízke riziko nie je potvrdenie identity ani garancia bezpečnosti. Stredné riziko znamená, že požiadavku treba potvrdiť mimo pôvodného kanála. Vysoké riziko vyžaduje viac silných znakov alebo jasný vzorec impersonácie či podvodu. VŽDY odpovedaj iba platným JSON objektom v slovenčine, bez markdownu.";
  const userPrompt = `Over túto digitálnu komunikáciu. Najprv urč, za koho sa odosielateľ podľa obsahu vydáva. Potom pomenuj, čo presne má príjemca urobiť. Posúď, či dostupné údaje podporujú tvrdenú identitu, aké techniky sociálneho inžinierstva používa a aké technické signály sú prítomné. Neoznač obyčajnú platbu, faktúru ani odkaz automaticky ako podvod. Každý finding MUSÍ obsahovať krátky doslovný úryvok z obsahu v poli evidence a stručné vysvetlenie v poli explanation. Nevymýšľaj odosielateľa, doménu ani fakt. Pri nízkom riziku môžu byť findings prázdne. Vráť túto presnú JSON schému v slovenčine: { "riskLevel": "low|medium|high", "claimedIdentity": "kto tvrdí, že komunikuje, alebo že sa to nedá určiť", "requestedAction": "čo má príjemca urobiť, alebo že sa to nedá určiť", "identityConsistency": "čo identitu potvrdzuje, spochybňuje alebo prečo sa nedá potvrdiť", "socialEngineeringSignals": ["konkrétne manipulačné techniky"], "technicalSignals": ["konkrétne technické zistenia"], "findings": [{ "evidence": "presný úryvok z obsahu", "explanation": "prečo je relevantný" }], "recommendation": "jeden konkrétny bezpečný krok" }\n\nObsah:\n${text}`;

  const createCompletion = (forceJson: boolean) =>
    groq.chat.completions.create({
      model,
      ...(forceJson ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.1,
  });

  let response;
  try {
    response = await createCompletion(true);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (!message.includes("json") && !message.includes("validate")) throw error;
    response = await createCompletion(false);
  }

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Empty Groq response");
  return parseJsonObject<ModelFraudAnalysis>(content);
}

export function analyzeFraudLocally(text: string): AnalysisResult {
  const normalized = text.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const addSignal = (matches: boolean, reason: string, weight: number) => {
    if (!matches) return;
    score += weight;
    reasons.push(reason);
  };

  addSignal(
    /https?:\/\/|\bwww\./i.test(text),
    "Obsah obsahuje odkaz; pri podozrivej správe ho neotvárajte priamo.",
    1,
  );
  addSignal(
    /urgent|okamžite|hneď|ihneď|posledn[aá] šanca|do \d+ hod/i.test(normalized),
    "Správa používa časový tlak, ktorý je častou manipulačnou technikou.",
    2,
  );
  addSignal(
    /heslo|password|prihl[aá]s|login|overovac[ií] k[oó]d|otp|2fa|cvv/i.test(
      normalized,
    ),
    "Požiadavka sa týka prihlasovacích alebo bezpečnostných údajov.",
    4,
  );
  addSignal(
    /iban|č[ií]slo účtu|bank transfer|platba|prevod|faktúr|invoice|karta|card/i.test(
      normalized,
    ),
    "Obsah žiada platbu alebo pracuje s bankovými údajmi.",
    3,
  );
  addSignal(
    /zmena.*iban|nov[ýá].*(iban|účet)|zmeňte.*(účet|platbu)/i.test(normalized),
    "Zmena platobných údajov vyžaduje nezávislé overenie s overeným kontaktom.",
    4,
  );
  addSignal(
    /invest|crypto|bitcoin|garantovan[ýé]|zaručen[ýé].*(zisk|výnos)/i.test(
      normalized,
    ),
    "Ponuka obsahuje investičné alebo neprimerane výhodné tvrdenia.",
    3,
  );
  addSignal(
    /riaditeľ|ceo|konateľ|banka|pol[ií]cia|finančn[aá] správa|microsoft|google|apple/i.test(
      normalized,
    ),
    "Správa sa opiera o autoritu alebo známu značku; identitu treba overiť mimo správy.",
    2,
  );

  const riskLevel = score >= 6 ? "high" : score >= 3 ? "medium" : "low";
  return {
    riskLevel,
    reasons:
      reasons.length > 0
        ? reasons.slice(0, 5)
        : [
            "Automatická kontrola našla len obmedzené množstvo technických signálov; pri citlivej požiadavke odporúčame nezávislé overenie.",
          ],
    recommendation:
      riskLevel === "high"
        ? "Neklikajte, neplaťte a neposielajte údaje. Požiadavku overte cez oficiálny kontakt alebo vlastnú aplikáciu."
        : riskLevel === "medium"
          ? "Pred ďalším krokom si požiadavku overte mimo pôvodnej správy cez známy oficiálny kontakt."
          : "Nenašli sa silné varovné signály. Pri platbe, prístupe alebo zmene údajov aj tak použite nezávislé overenie.",
  };
}

export async function analyzeForFraudResilient(
  text: string,
): Promise<AnalysisResult> {
  const fallback = analyzeContentRisk(text);
  const hasModel = Boolean(
    process.env.GROQ_API_KEY?.trim() &&
    !process.env.GROQ_API_KEY.startsWith("your_"),
  );
  if (!hasModel) return fallback;

  try {
    const modelResult = await analyzeForFraud(text);
    const validRisk =
      modelResult.riskLevel === "low" ||
      modelResult.riskLevel === "medium" ||
      modelResult.riskLevel === "high";
    if (
      !validRisk ||
      !Array.isArray(modelResult.findings) ||
      typeof modelResult.claimedIdentity !== "string" ||
      typeof modelResult.requestedAction !== "string" ||
      typeof modelResult.identityConsistency !== "string" ||
      !Array.isArray(modelResult.socialEngineeringSignals) ||
      !Array.isArray(modelResult.technicalSignals) ||
      !modelResult.recommendation?.trim()
    )
      return fallback;

    // Never let a model downgrade a concrete, explainable high-risk pattern.
    if (fallback.riskLevel === "high" && modelResult.riskLevel === "low")
      return fallback;

    const normalizedText = text.toLocaleLowerCase("sk-SK").replace(/\s+/g, " ");
    const reasons = modelResult.findings
      .filter(
        (finding) =>
          typeof finding?.evidence === "string" &&
          typeof finding?.explanation === "string",
      )
      .map((finding) => ({
        evidence: finding.evidence.trim().replace(/\s+/g, " "),
        explanation: finding.explanation.trim(),
      }))
      .filter(
        ({ evidence, explanation }) =>
          evidence.length >= 3 &&
          evidence.length <= 180 &&
          explanation.length >= 4 &&
          normalizedText.includes(evidence.toLocaleLowerCase("sk-SK")),
      )
      .slice(0, 3)
      .map(({ evidence, explanation }) => `„${evidence}“ — ${explanation}`);

    const cleanField = (value: string, fallbackValue: string) => {
      const cleaned = value.trim().replace(/\s+/g, " ").slice(0, 320);
      return cleaned || fallbackValue;
    };
    const structuredReasons = [
      `[IDENTITY] ${cleanField(modelResult.claimedIdentity, "Tvrdenú identitu sa zo zadaného obsahu nedá určiť.")}`,
      `[REQUEST] ${cleanField(modelResult.requestedAction, "Požadovanú akciu sa zo zadaného obsahu nedá určiť.")}`,
      `[CONSISTENCY] ${cleanField(modelResult.identityConsistency, "Identitu sa z dostupných údajov nedá potvrdiť.")}`,
      ...modelResult.socialEngineeringSignals
        .filter((signal): signal is string => typeof signal === "string")
        .map((signal) => cleanField(signal, ""))
        .filter(Boolean)
        .slice(0, 3)
        .map((signal) => `[SOCIAL] ${signal}`),
      ...modelResult.technicalSignals
        .filter((signal): signal is string => typeof signal === "string")
        .map((signal) => cleanField(signal, ""))
        .filter(Boolean)
        .slice(0, 3)
        .map((signal) => `[TECHNICAL] ${signal}`),
    ];

    if (modelResult.riskLevel !== "low" && reasons.length === 0 && structuredReasons.length < 3)
      return fallback;

    return {
      riskLevel: modelResult.riskLevel,
      reasons:
        [...structuredReasons, ...reasons],
      recommendation: modelResult.recommendation.trim(),
    };
  } catch (error) {
    console.warn(
      "[fraud-analysis] AI model unavailable, using local risk algorithm.",
      error,
    );
    return fallback;
  }
}

export async function extractFraudSignalsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<ImageFraudSignals> {
  const openai = getOpenAiClient();

  if (openai) {
    try {
      const base64 = imageBuffer.toString("base64");

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        instructions: [
          "Si OCR asistent pre FEELSODD, systém overovania identity v digitálnej komunikácii.",
          "Pozorne prečítaj screenshot v slovenčine alebo angličtine.",
          "Vráť len platný JSON bez markdownu.",
          'Ak je text nečitateľný, stále skús opísať vizuálny kontext a prázdny text nechaj ako "".',
          'Schema: {"visibleText": string, "contextSummary": string, "suspiciousVisualSignals": string[]}',
        ].join(" "),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Extrahuj text, opíš typ komunikácie a vypíš viditeľné znaky vydávania sa za osobu alebo organizáciu, časového tlaku, výzvy na kliknutie, platbu, zmenu IBAN alebo odovzdanie údajov.",
              },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${base64}`,
                detail: "auto",
              },
            ],
          },
        ],
      });

      const content = response.output_text;
      if (!content)
        throw new Error("Empty OpenAI response for screenshot analysis");

      return parseJsonObject<ImageFraudSignals>(content);
    } catch (error) {
      console.warn(
        "[image-ocr] OpenAI vision failed, falling back to local Tesseract OCR.",
        error,
      );
    }
  }

  const visibleText = await extractTextWithLocalOcr(imageBuffer, mimeType);

  return {
    visibleText,
    contextSummary: inferContextFromText(visibleText),
    suspiciousVisualSignals: inferSuspiciousSignalsFromText(visibleText),
  };
}

// Transcribe an audio file (Buffer) using Groq Whisper
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
): Promise<string> {
  const groq = getGroqClient();
  const arrayBuffer = new ArrayBuffer(audioBuffer.byteLength);
  new Uint8Array(arrayBuffer).set(audioBuffer);
  const file = new File([arrayBuffer], filename, { type: "audio/mpeg" });
  const response = await groq.audio.transcriptions.create({
    model: "whisper-large-v3",
    file,
    language: "sk", // Slovak primary — Whisper auto-detects if wrong
    response_format: "text",
  });
  return response as unknown as string;
}
