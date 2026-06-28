import type { KnowledgeChapter, KnowledgePart, ParsedKnowledgeDocument } from '@/lib/knowledge-engine/types';

type HeadingMatch = { number: string; title: string };
type WorkingChapter = KnowledgeChapter & { documentKey: string | null };

function cleanHeadingText(line: string) {
  return line.trim().replace(/^#{1,6}\s+/, '').replaceAll('**', '').trim();
}

function cleanTitle(value: string | undefined, fallback: string) {
  const title = (value ?? '').replace(/^\*+|\*+$/g, '').replace(/^(?:—|–|-|:)\s*/, '').trim();
  return title || fallback;
}

function isMarkdownHeading(line: string) {
  return /^\s{0,3}#{1,6}\s+/.test(line);
}

function matchStructuralPart(line: string): HeadingMatch | null {
  if (!isMarkdownHeading(line)) return null;
  const match = cleanHeadingText(line).match(/^PART\s+([IVXLCDM]+|\d+)(?:\s+(.+))?$/i);
  if (!match) return null;
  return { number: match[1].toUpperCase(), title: cleanTitle(match[2], `Part ${match[1].toUpperCase()}`) };
}

function matchStructuralChapter(line: string): HeadingMatch | null {
  if (!isMarkdownHeading(line)) return null;
  const match = cleanHeadingText(line).match(/^Chapter\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/i);
  if (!match) return null;
  return { number: match[1], title: cleanTitle(match[2], `Chapter ${match[1]}`) };
}

function matchMetadataChapter(line: string): HeadingMatch | null {
  const text = line.trim().replaceAll('**', '');
  const match = text.match(/^Chapter:\s*(\d+(?:\.\d+)?)(?:\s+(.+))?$/i);
  if (!match) return null;
  return { number: match[1], title: cleanTitle(match[2], `Chapter ${match[1]}`) };
}

function metadataKind(line: string) {
  const text = line.trim().replaceAll('**', '');
  if (/^Document:\s*.+/i.test(text)) return 'document';
  if (/^Part:\s*(?:[IVXLCDM]+|\d+)\b/i.test(text)) return 'part';
  if (/^Chapter:\s*\d+(?:\.\d+)?\b/i.test(text)) return 'chapter';
  if (/^Continuation:\s*/i.test(text)) return 'continuation';
  if (/^(?:#{1,6}\s+)?Frozen Rewrite(?:\b.*)?$/i.test(text)) return 'continuation';
  if (/^Part\s+(?:\d+|[IVXLCDM]+)\s+of\s+(?:\d+|N|[IVXLCDM]+)\s*$/i.test(text)) return 'continuation';
  return null;
}

function documentKey(line: string) {
  const match = line.trim().replaceAll('**', '').match(/^Document:\s*(.+)$/i);
  return match ? normalizeTitle(match[1]) : null;
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(?:continued|continuation)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function similarTitles(left: string, right: string) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (a === b) return true;
  if (!a || !b) return false;
  if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) / Math.max(a.length, b.length) >= 0.75) return true;
  const aWords = new Set(a.split(' '));
  const bWords = new Set(b.split(' '));
  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 && intersection / union >= 0.75;
}

function countWords(content: string) {
  return content.trim().match(/\S+/g)?.length ?? 0;
}

function countHeadings(content: string) {
  return content.match(/^#{1,6}\s+.+$/gm)?.length ?? 0;
}

function lineTokens(markdown: string) {
  return markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function chapterId(number: string, duplicate: number) {
  const formatted = number.split('.').map((part, index) => index === 0 ? part.padStart(2, '0') : part).join('-');
  return duplicate === 1 ? `chapter-${formatted}` : `chapter-${formatted}-${String(duplicate).padStart(2, '0')}`;
}

export function parseMarkdown(rawMarkdown: string, status = 'Imported'): ParsedKnowledgeDocument {
  const parts: KnowledgePart[] = [];
  const chapters: WorkingChapter[] = [];
  const duplicateCounts = new Map<string, number>();
  let currentPart: KnowledgePart | null = null;
  let currentChapter: WorkingChapter | null = null;
  let pending: string[] = [];
  let currentDocumentKey: string | null = null;
  let continuationContext = false;
  let rawPartsDetected = 0;
  let rawChapterMarkersDetected = 0;
  let mergedContinuationCount = 0;
  let duplicateChapterMarkersHandled = 0;
  let continuationMarkersDetected = 0;
  const seenChapterMarkers = new Set<string>();

  const recordChapterMarker = (chapter: HeadingMatch) => {
    const key = `${currentDocumentKey ?? ''}:${chapter.number}:${normalizeTitle(chapter.title)}`;
    if (seenChapterMarkers.has(key)) duplicateChapterMarkersHandled += 1;
    else seenChapterMarkers.add(key);
  };

  const ensurePart = () => {
    if (currentPart) return currentPart;
    currentPart = { partId: 'part-01', partNumber: '1', title: 'Unassigned', detected: false, chapterIds: [] };
    parts.push(currentPart);
    return currentPart;
  };

  const append = (line: string) => {
    if (currentChapter) currentChapter.content += line;
    else pending.push(line);
  };

  for (const line of lineTokens(rawMarkdown)) {
    const metadata = metadataKind(line);
    if (metadata) {
      if (metadata === 'part') rawPartsDetected += 1;
      if (metadata === 'chapter') rawChapterMarkersDetected += 1;
      if (metadata === 'document') {
        currentDocumentKey = documentKey(line);
      }
      if (metadata === 'chapter') {
        const chapterMarker = matchMetadataChapter(line);
        if (chapterMarker) recordChapterMarker(chapterMarker);
      }
      if (metadata === 'continuation') {
        continuationContext = true;
        continuationMarkersDetected += 1;
      }
      append(line);
      continue;
    }

    const part = matchStructuralPart(line);
    if (part) {
      rawPartsDetected += 1;
      currentChapter = null;
      pending.push(line);
      const existingPart = parts.find((item) => item.partNumber === part.number && similarTitles(item.title, part.title));
      if (existingPart && continuationContext) {
        currentPart = existingPart;
        mergedContinuationCount += 1;
      } else {
        currentPart = {
          partId: `part-${String(parts.length + 1).padStart(2, '0')}`,
          partNumber: part.number,
          title: part.title,
          detected: true,
          chapterIds: [],
        };
        parts.push(currentPart);
      }
      continue;
    }

    const chapter = matchStructuralChapter(line);
    if (chapter) {
      rawChapterMarkersDetected += 1;
      recordChapterMarker(chapter);
      const candidates = chapters.filter((item) => item.chapterNumber === chapter.number);
      const existing = candidates.find((item) => (
        similarTitles(item.title, chapter.title)
        && (!item.documentKey || !currentDocumentKey || item.documentKey === currentDocumentKey)
      ));
      if (existing && continuationContext) {
        existing.content += pending.join('') + line;
        pending = [];
        currentChapter = existing;
        currentPart = parts.find((item) => item.partId === existing.partId) ?? currentPart;
        mergedContinuationCount += 1;
      } else {
        const partForChapter = ensurePart();
        const duplicate = (duplicateCounts.get(chapter.number) ?? 0) + 1;
        duplicateCounts.set(chapter.number, duplicate);
        currentChapter = {
          chapterId: chapterId(chapter.number, duplicate),
          chapterNumber: chapter.number,
          title: chapter.title,
          partId: partForChapter.partId,
          partTitle: partForChapter.title,
          status,
          filePath: '',
          wordCount: 0,
          headingCount: 0,
          content: pending.join('') + line,
          documentKey: currentDocumentKey,
        };
        pending = [];
        chapters.push(currentChapter);
        partForChapter.chapterIds.push(currentChapter.chapterId);
      }
      continuationContext = false;
      continue;
    }

    append(line);
  }

  if (pending.length > 0 && chapters.length > 0) chapters[chapters.length - 1].content += pending.join('');
  for (const chapter of chapters) {
    chapter.wordCount = countWords(chapter.content);
    chapter.headingCount = countHeadings(chapter.content);
  }

  return {
    parts,
    chapters: chapters.map(({ documentKey: _documentKey, ...chapter }) => chapter),
    diagnostics: {
      rawPartsDetected,
      rawChapterMarkersDetected,
      canonicalPartsProduced: parts.length,
      canonicalChaptersProduced: chapters.length,
      mergedContinuationCount,
      duplicateChapterMarkersHandled,
      continuationMarkersDetected,
    },
  };
}
