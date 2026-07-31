import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import type { AnalysisResult } from './types'

const execFileAsync = promisify(execFile)

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim()

  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error('AI analýza nie je nakonfigurovaná. Nastavte GROQ_API_KEY.')
  }

  return new Groq({ apiKey })
}

function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey || apiKey.startsWith('your_')) return null

  return new OpenAI({ apiKey })
}

interface ImageFraudSignals {
  visibleText: string
  contextSummary: string
  suspiciousVisualSignals: string[]
}

function parseJsonObject<T>(content: string): T {
  const normalized = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  return JSON.parse(normalized) as T
}

function normalizeOcrText(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getImageExtension(mimeType: string): string {
  if (mimeType.includes('png')) return '.png'
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg'
  if (mimeType.includes('webp')) return '.webp'
  if (mimeType.includes('heic')) return '.heic'
  if (mimeType.includes('heif')) return '.heif'
  return '.img'
}

async function runTesseract(inputPath: string, outputBase: string) {
  const candidates = [
    process.env.TESSERACT_PATH,
    '/opt/homebrew/bin/tesseract',
    'tesseract',
  ].filter(Boolean) as string[]

  let lastError: unknown = null

  for (const command of candidates) {
    try {
      await execFileAsync(command, [inputPath, outputBase, '-l', 'eng', '--psm', '6', 'txt'])
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Lokálny OCR engine Tesseract sa nepodarilo spustiť.')
}

async function extractTextWithLocalOcr(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const workingDir = await mkdtemp(join(tmpdir(), 'truststep-ocr-'))
  const inputPath = join(workingDir, `input${getImageExtension(mimeType)}`)
  const outputBase = join(workingDir, 'ocr-output')

  try {
    await writeFile(inputPath, imageBuffer)
    await runTesseract(inputPath, outputBase)
    const rawText = await readFile(`${outputBase}.txt`, 'utf8')
    return normalizeOcrText(rawText)
  } finally {
    await rm(workingDir, { recursive: true, force: true })
  }
}

function inferContextFromText(text: string): string {
  const normalized = text.toLowerCase()

  if (/(subject:|from:|reply-to:|unsubscribe|doručená pošta|inbox)/i.test(normalized)) {
    return 'Screenshot e-mailu alebo poštového klienta.'
  }

  if (/(whatsapp|messenger|telegram|chat|správa|message)/i.test(normalized)) {
    return 'Screenshot chatovej alebo messaging komunikácie.'
  }

  if (/(facebook|instagram|sponsored|reklama|advertisement|marketplace)/i.test(normalized)) {
    return 'Screenshot sociálnej siete, reklamy alebo marketplace ponuky.'
  }

  if (/(iban|faktúra|invoice|payment|platba|prevod|účet)/i.test(normalized)) {
    return 'Screenshot platobnej výzvy, faktúry alebo bankovej komunikácie.'
  }

  if (/(login|sign in|prihlás|password|heslo|verification code|otp)/i.test(normalized)) {
    return 'Screenshot prihlasovacej alebo verifikačnej výzvy.'
  }

  return 'Screenshot digitálnej komunikácie alebo webového obsahu.'
}

function inferSuspiciousSignalsFromText(text: string): string[] {
  const normalized = text.toLowerCase()
  const signals: string[] = []

  if (/(urgent|urgentne|urgentný|okamžite|hneď|ihneď|limited time|posledná šanca)/i.test(normalized)) {
    signals.push('urgentný jazyk alebo tlak na rýchlu reakciu')
  }

  if (/(click|klikn|link|odkaz|verify|overte|confirm|potvrďte|login|prihlás)/i.test(normalized)) {
    signals.push('výzva na kliknutie, overenie alebo prihlásenie')
  }

  if (/(iban|wallet|crypto|bitcoin|deposit|platba|prevod|bank transfer|investment|invest)/i.test(normalized)) {
    signals.push('výzva na platbu, investovanie alebo prevod peňazí')
  }

  if (/(password|heslo|otp|kód|kod|cvv|card|občiansk|rodné číslo|personal data)/i.test(normalized)) {
    signals.push('žiadosť o citlivé údaje alebo prístupové informácie')
  }

  if (/(premiér|prezident|minister|politik|celebrity|známa osobnosť|public figure)/i.test(normalized)) {
    signals.push('zmienka o verejnej osobe alebo autorite')
  }

  if (/(garantovan|zaručen|profit|výnos|returns?|giveaway|vyhraj|zdvojnásob)/i.test(normalized)) {
    signals.push('príliš výhodná alebo manipulatívna ponuka')
  }

  return signals
}

export async function analyzeForFraud(text: string): Promise<AnalysisResult> {
  const groq = getGroqClient()
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Si expert na detekciu podvodov. Analyzuješ e-maily, SMS správy, webstránky, landing pages, screenshoty aj prepisy hovorov. Vieš rozoznať phishing, investičné scam reklamy, impersonáciu verejných osôb, leadgen funnel a manipulatívne výzvy. VŽDY odpovedaj len platným JSON objektom v slovenčine, bez markdown formátovania.',
      },
      {
        role: 'user',
        content: `Analyzuj tento obsah z hľadiska rizika podvodu. Skontroluj: urgentný jazyk, žiadosti o platbu alebo IBAN, investičné a zázračne výhodné ponuky, scam reklamy, leadgen formuláre, redirecty na inú doménu, reklamné tracking vzorce, zmienky o politikoch alebo celebritách, nesúlad domény odosielateľa, žiadosti o citlivé údaje alebo prístupy, vydávanie sa za autoritu a neobvyklé pokyny na prevod. Vráť JSON v slovenčine: { "riskLevel": "low|medium|high", "reasons": string[], "recommendation": string }\n\nObsah:\n${text}`,
      },
    ],
    temperature: 0.2,
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('Empty Groq response')
  return parseJsonObject<AnalysisResult>(content)
}

export async function extractFraudSignalsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<ImageFraudSignals> {
  const openai = getOpenAiClient()

  if (openai) {
    try {
      const base64 = imageBuffer.toString('base64')

      const response = await openai.responses.create({
        model: 'gpt-4.1-mini',
        instructions: [
          'Si OCR a fraud triage asistent pre TrustStep.',
          'Pozorne prečítaj screenshot v slovenčine alebo angličtine.',
          'Vráť len platný JSON bez markdownu.',
          'Ak je text nečitateľný, stále skús opísať vizuálny kontext a prázdny text nechaj ako "".',
          'Schema: {"visibleText": string, "contextSummary": string, "suspiciousVisualSignals": string[]}',
        ].join(' '),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Extrahuj text, opíš typ obsahu (napr. SMS, chat, reklama, marketplace, banková výzva) a vypíš vizuálne podozrivé znaky ako urgentnosť, výzvu na klik, platbu, IBAN, vydávanie sa za autoritu alebo príliš výhodnú ponuku.',
              },
              {
                type: 'input_image',
                image_url: `data:${mimeType};base64,${base64}`,
                detail: 'auto',
              },
            ],
          },
        ],
      })

      const content = response.output_text
      if (!content) throw new Error('Empty OpenAI response for screenshot analysis')

      return parseJsonObject<ImageFraudSignals>(content)
    } catch (error) {
      console.warn('[image-ocr] OpenAI vision failed, falling back to local Tesseract OCR.', error)
    }
  }

  const visibleText = await extractTextWithLocalOcr(imageBuffer, mimeType)

  return {
    visibleText,
    contextSummary: inferContextFromText(visibleText),
    suspiciousVisualSignals: inferSuspiciousSignalsFromText(visibleText),
  }
}

// Transcribe an audio file (Buffer) using Groq Whisper
export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const groq = getGroqClient()
  const arrayBuffer = new ArrayBuffer(audioBuffer.byteLength)
  new Uint8Array(arrayBuffer).set(audioBuffer)
  const file = new File([arrayBuffer], filename, { type: 'audio/mpeg' })
  const response = await groq.audio.transcriptions.create({
    model: 'whisper-large-v3',
    file,
    language: 'sk', // Slovak primary — Whisper auto-detects if wrong
    response_format: 'text',
  })
  return response as unknown as string
}
