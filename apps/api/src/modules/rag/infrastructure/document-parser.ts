import path from 'node:path';
import mammoth from 'mammoth';

export const MAX_RAG_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_RAG_EXTENSIONS = new Set(['.txt', '.md', '.pdf', '.docx', '.doc']);

export class UnsupportedRagFileError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function extractDocumentText(filename: string, buffer: Buffer): Promise<{ text: string; mimeType: string }> {
  if (!buffer || buffer.length === 0) {
    throw new UnsupportedRagFileError('File is empty');
  }
  if (buffer.length > MAX_RAG_FILE_BYTES) {
    throw new UnsupportedRagFileError('File exceeds 5MB limit');
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_RAG_EXTENSIONS.has(ext)) {
    throw new UnsupportedRagFileError('Unsupported file format. Allowed: PDF, TXT, MD, DOC, DOCX');
  }

  if (ext === '.txt' || ext === '.md') {
    return {
      text: buffer.toString('utf8').trim(),
      mimeType: ext === '.md' ? 'text/markdown' : 'text/plain',
    };
  }

  if (ext === '.pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    return { text: parsed.text.trim(), mimeType: 'application/pdf' };
  }

  if (ext === '.docx') {
    const parsed = await mammoth.extractRawText({ buffer });
    return {
      text: parsed.value.trim(),
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  // .doc legacy binary Word format
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WordExtractor = require('word-extractor') as new () => { extract(buf: Buffer): Promise<{ getBody(): string }> };
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return { text: doc.getBody().trim(), mimeType: 'application/msword' };
}
