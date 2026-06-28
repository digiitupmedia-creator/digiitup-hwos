import { promises as fs } from 'fs';
import path from 'path';
import { parseMarkdown } from '@/lib/knowledge-engine/parse-markdown';

export async function runContinuationRegressionCheck() {
  const fixturePath = path.join(process.cwd(), 'lib', 'knowledge-engine', 'fixtures', 'continuation-regression.md');
  const source = await fs.readFile(fixturePath, 'utf8');
  const parsed = parseMarkdown(source, 'Frozen');
  const failures: string[] = [];
  if (parsed.parts.length !== 1) failures.push(`Expected 1 canonical part, received ${parsed.parts.length}.`);
  if (parsed.chapters.length !== 1) failures.push(`Expected 1 canonical chapter, received ${parsed.chapters.length}.`);
  if (parsed.chapters[0]?.chapterNumber !== '2') failures.push('Expected canonical Chapter 2.');
  if (!parsed.chapters[0]?.content.includes('Small continuation fragment.')) failures.push('Continuation content was not merged.');
  if (!parsed.chapters[0]?.content.includes('Continuation: Part 3 of 3')) failures.push('Continuation markers were not preserved.');
  if (parsed.chapters[0]?.content !== source) failures.push('Canonical chapter content does not exactly preserve the source fixture.');
  if (parsed.diagnostics.duplicateChapterMarkersHandled !== 5) failures.push('Duplicate chapter diagnostics are incorrect.');
  if (parsed.diagnostics.mergedContinuationCount < 2) failures.push('Continuation merge diagnostics are incorrect.');
  return { valid: failures.length === 0, failures, diagnostics: parsed.diagnostics };
}
