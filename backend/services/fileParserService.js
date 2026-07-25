import fs from "fs/promises";
import path from "path";

// Real text extraction for AI file analysis — no mock/placeholder summaries.
// Supports PDF, DOCX/DOC, and plain text. Anything else falls back to a
// clear "unsupported" marker instead of pretending to have read the file.
const MAX_CHARS = 12000; // keep prompt payloads bounded for Gemini context

export const extractTextFromFile = async (filePath, originalName, mimetype) => {
  const ext = path.extname(originalName).toLowerCase();

  try {
    if (ext === ".pdf" || mimetype === "application/pdf") {
      const { default: pdfParse } = await import("pdf-parse");
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return truncate(data.text);
    }

    if (
      ext === ".docx" ||
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return truncate(result.value);
    }

    if (ext === ".doc" || mimetype === "application/msword") {
      // Legacy binary .doc has no reliable pure-JS parser — read as best-effort
      // text rather than silently faking a summary.
      const buffer = await fs.readFile(filePath);
      return truncate(buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " "));
    }

    if (ext === ".txt" || mimetype === "text/plain" || ext === ".csv" || mimetype === "text/csv") {
      const text = await fs.readFile(filePath, "utf-8");
      return truncate(text);
    }

    return `[Unsupported file type "${ext}" — only PDF, DOCX, DOC, TXT, and CSV can be analyzed.]`;
  } catch (err) {
    console.error("[fileParserService] Extraction failed:", err.message);
    return `[Could not extract text from "${originalName}": ${err.message}]`;
  }
};

function truncate(text) {
  const clean = (text || "").trim();
  if (clean.length <= MAX_CHARS) return clean;
  return clean.slice(0, MAX_CHARS) + "\n\n[... content truncated for length ...]";
}
