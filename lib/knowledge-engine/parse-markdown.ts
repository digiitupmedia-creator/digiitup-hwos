import type { KnowledgeChapter, KnowledgePart, ParsedKnowledgeDocument } from '@/lib/knowledge-engine/types';

type HeadingMatch = { number: string; title: string };

function cleanHeadingText(line: string) {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replaceAll('**', '')
    .trim();
}

function cleanTitle(value: string | undefined, fallback: string) {
  const title = (value ?? '').replace(/^\*+|\*+$/g, '').trim();
  return title || fallback;
}

function matchPart(line: string): HeadingMatch | null {
  const text = cleanHeadingText(line);
  const match = text.match(/^(?:PART\s+|Part:\s*)([IVXLCDM]+|\d+)(?:\s+(.+))?$/i);
  if (!match) return null;
  return { number: match[1].toUpperCase(), title: cleanTitle(match[2]?.replace(/^(?:—|–|-|:)\s*/, ''), `Part ${match[1].toUpperCase()}`) };
}

function matchChapter(line: string): HeadingMatch | null {
  const text = cleanHeadingText(line);
  const match = text.match(/^(?:Chapter\s+|Chapter:\s*)(\d+(?:\.\d+)?)(?:\s+(.+))?$/i);
  if (!match) return null;
  return { number: match[1], title: cleanTitle(match[2]?.replace(/^(?:—|–|-|:)\s*/, ''), `Chapter ${match[1]}`) };
}

function countWords(content: string) {
  const words = content.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function countHeadings(content: string) {
  return content.match(/^#{1,6}\s+.+$/gm)?.length ?? 0;
}

function lineTokens(markdown: string) {
  return markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

export function parseMarkdown(rawMarkdown: string, status = 'Imported'): ParsedKnowledgeDocument {
  const parts: KnowledgePart[] = [];
  const chapters: KnowledgeChapter[] = [];
  const duplicateCounts = new Map<string, number>();
  let currentPart: KnowledgePart | null = null;
  let currentChapter: { number: string; title: string; part: KnowledgePart; content: string[] } | null = null;
  let pending: string[] = [];
  let repeatedContinuationMarkers = 0;

  const ensurePart = () => {
    if (currentPart) return currentPart;
    currentPart = { partId: 'part-01', partNumber: '1', title: 'Unassigned', detected: false, chapterIds: [] };
    parts.push(currentPart);
    return currentPart;
  };

  const finishChapter = () => {
    if (!currentChapter) return;
    const content = currentChapter.content.join('');
    const chapterNumberForId = currentChapter.number
      .split('.')
      .map((part, index) => index === 0 ? part.padStart(2, '0') : part)
      .join('-');
    const baseId = `chapter-${chapterNumberForId}`;
    const duplicate = (duplicateCounts.get(currentChapter.number) ?? 0) + 1;
    duplicateCounts.set(currentChapter.number, duplicate);
    const chapterId = duplicate === 1 ? baseId : `${baseId}-${String(duplicate).padStart(2, '0')}`;
    const chapter: KnowledgeChapter = {
      chapterId,
      chapterNumber: currentChapter.number,
      title: currentChapter.title,
      partId: currentChapter.part.partId,
      partTitle: currentChapter.part.title,
      status,
      filePath: '',
      wordCount: countWords(content),
      headingCount: countHeadings(content),
      content,
    };
    chapters.push(chapter);
    currentChapter.part.chapterIds.push(chapterId);
    currentChapter = null;
  };

  for (const line of lineTokens(rawMarkdown)) {
    const part = matchPart(line);
    if (part) {
      finishChapter();
      pending.push(line);
      currentPart = {
        partId: `part-${String(parts.length + 1).padStart(2, '0')}`,
        partNumber: part.number,
        title: part.title,
        detected: true,
        chapterIds: [],
      };
      parts.push(currentPart);
      continue;
    }

    const chapter = matchChapter(line);
    if (chapter) {
      const isContinuation = /\bcontinu(?:ation|ed)\b/i.test(chapter.title);
      if (isContinuation) repeatedContinuationMarkers += 1;
      if (currentChapter && currentChapter.number === chapter.number && isContinuation) {
        currentChapter.content.push(line);
        continue;
      }
      finishChapter();
      const partForChapter = ensurePart();
      currentChapter = {
        number: chapter.number,
        title: chapter.title,
        part: partForChapter,
        content: [...pending, line],
      };
      pending = [];
      continue;
    }

    if (currentChapter) currentChapter.content.push(line);
    else pending.push(line);
  }

  finishChapter();
  if (pending.length > 0 && chapters.length > 0) {
    const last = chapters[chapters.length - 1];
    last.content += pending.join('');
    last.wordCount = countWords(last.content);
    last.headingCount = countHeadings(last.content);
  }

  return { parts, chapters, repeatedContinuationMarkers };
}
