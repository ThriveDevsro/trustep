import "server-only";

import { PDFParse } from "pdf-parse";
import { extractFraudSignalsFromImage } from "./ai";

const MAX_PDF_PAGES = 80;
const MAX_TEXT_PAGES = 40;
const MAX_OCR_PAGES = 3;
const MAX_EXTRACTED_CHARACTERS = 24_000;

export class PdfDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfDocumentError";
  }
}

export interface ExtractedPdfDocument {
  text: string;
  pageCount: number;
  extraction: "text" | "ocr";
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

export function hasPdfSignature(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function extractPdfDocument(
  buffer: Buffer,
): Promise<ExtractedPdfDocument> {
  if (!hasPdfSignature(buffer)) {
    throw new PdfDocumentError("Súbor nemá platnú PDF hlavičku.");
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const info = await parser.getInfo();
    const pageCount = info.total;

    if (!pageCount || pageCount < 1) {
      throw new PdfDocumentError("PDF neobsahuje žiadnu čitateľnú stranu.");
    }
    if (pageCount > MAX_PDF_PAGES) {
      throw new PdfDocumentError(
        `PDF môže mať najviac ${MAX_PDF_PAGES} strán. Nahrajte iba relevantnú časť dokumentu.`,
      );
    }

    const textResult = await parser.getText({
      first: Math.min(pageCount, MAX_TEXT_PAGES),
    });
    const embeddedText = normalizePdfText(textResult.text);

    if (embeddedText.length >= 40) {
      return { text: embeddedText, pageCount, extraction: "text" };
    }

    const screenshots = await parser.getScreenshot({
      first: Math.min(pageCount, MAX_OCR_PAGES),
      desiredWidth: 1600,
      imageDataUrl: false,
      imageBuffer: true,
    });
    const ocrPages: string[] = [];

    for (let index = 0; index < screenshots.pages.length; index += 1) {
      const page = screenshots.pages[index];
      if (!page.data) continue;
      const extracted = await extractFraudSignalsFromImage(
        Buffer.from(page.data),
        "image/png",
      );
      if (extracted.visibleText.trim()) {
        ocrPages.push(`Strana ${index + 1}:\n${extracted.visibleText.trim()}`);
      }
    }

    const ocrText = normalizePdfText(ocrPages.join("\n\n"));
    if (ocrText.length < 10) {
      throw new PdfDocumentError(
        "Z PDF sa nepodarilo prečítať text. Nahrajte ostrejší dokument alebo screenshot relevantnej strany.",
      );
    }

    return { text: ocrText, pageCount, extraction: "ocr" };
  } catch (error) {
    if (error instanceof PdfDocumentError) throw error;

    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("password") || message.includes("encrypted")) {
      throw new PdfDocumentError(
        "PDF je chránené heslom. Nahrajte odomknutú kópiu dokumentu.",
      );
    }

    throw new PdfDocumentError(
      "PDF sa nepodarilo spracovať. Skontrolujte, či súbor nie je poškodený.",
    );
  } finally {
    await parser.destroy();
  }
}
