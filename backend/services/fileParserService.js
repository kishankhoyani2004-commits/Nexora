import path from "path";

// Real text extraction for AI file analysis — no mock/placeholder summaries.
// Supports PDF, DOCX/DOC, and plain text. Accepts a Buffer (memory storage)
// OR a file-path string (disk storage) so it works on Render with memoryStorage.
const MAX_CHARS = 12000; // keep prompt payloads bounded for Gemini context

export const extractTextFromFile = async (filePathOrBuffer, originalName, mimetype) => {
  const ext = path.extname(originalName).toLowerCase();

  // Normalise to a Buffer — either it already is one, or read it from disk.
  let buffer;
  try {
    if (Buffer.isBuffer(filePathOrBuffer)) {
      buffer = filePathOrBuffer;
    } else {
      const fs = await import("fs/promises");
      buffer = await fs.default.readFile(filePathOrBuffer);
    }
  } catch (err) {
    return `[Could not read file "${originalName}": ${err.message}]`;
  }

  try {
    if (ext === ".pdf" || mimetype === "application/pdf") {
      const { default: pdfParse } = await import("pdf-parse");
      const data = await pdfParse(buffer);
      return truncate(data.text);
    }

    if (
      ext === ".docx" ||
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return truncate(result.value);
    }

    if (ext === ".doc" || mimetype === "application/msword") {
      return truncate(buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " "));
    }

    if (ext === ".txt" || mimetype === "text/plain" || ext === ".csv" || mimetype === "text/csv") {
      return truncate(buffer.toString("utf-8"));
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
