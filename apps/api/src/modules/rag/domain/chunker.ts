/** Splits text into overlapping chunks suitable for hybrid RAG indexing. */
export function chunkText(raw: string, maxChars = 900, overlap = 150): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    let end = Math.min(normalized.length, start + maxChars);
    if (end < normalized.length) {
      const breakAt = normalized.lastIndexOf('\n', end);
      const spaceAt = normalized.lastIndexOf(' ', end);
      const candidate = breakAt > start + maxChars * 0.5 ? breakAt : spaceAt > start + maxChars * 0.5 ? spaceAt : end;
      end = candidate;
    }
    const piece = normalized.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= normalized.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return chunks;
}

export interface RankedChunkCandidate {
  chunkId: string;
  documentId: string;
  title: string;
  sourceType: string;
  content: string;
}

/** Reciprocal Rank Fusion (RRF) combining vector similarity and PostgreSQL full-text search ranks. */
export function reciprocalRankFusion<T extends RankedChunkCandidate>(
  vectorList: readonly T[],
  ftsList: readonly T[],
  k = 60,
): Array<T & { score: number }> {
  const scores = new Map<string, { item: T; score: number }>();

  vectorList.forEach((item, index) => {
    const entry = scores.get(item.chunkId) ?? { item, score: 0 };
    entry.score += 1 / (k + index + 1);
    scores.set(item.chunkId, entry);
  });

  ftsList.forEach((item, index) => {
    const entry = scores.get(item.chunkId) ?? { item, score: 0 };
    entry.score += 1 / (k + index + 1);
    scores.set(item.chunkId, entry);
  });

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(entry => ({ ...entry.item, score: Number(entry.score.toFixed(6)) }));
}
