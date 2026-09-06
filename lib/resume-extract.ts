/**
 * Server-only helper: extracts plain text from a resume file buffer.
 * Supports PDF and DOCX (the two formats the job form accepts that have
 * reliable free extraction libraries). Old binary .doc files aren't
 * supported — mammoth only reads .docx, and there's no good free .doc
 * parser — so those fall back to the saved resume text instead.
 */
export async function extractResumeText(
  buffer: Buffer,
  filePath: string
): Promise<string> {
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text ?? "";
  }

  if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  if (lower.endsWith(".doc")) {
    throw new Error(
      "Old .doc files can't be auto-read — please re-upload this resume as a .docx or .pdf."
    );
  }

  throw new Error("Unsupported resume file type for automatic reading.");
}
