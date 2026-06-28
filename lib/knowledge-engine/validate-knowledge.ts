import { promises as fs } from 'fs';
import path from 'path';
import type {
  KnowledgePackage,
  KnowledgeValidationResult,
  ParsedKnowledgeDocument,
} from '@/lib/knowledge-engine/types';

const rootDir = process.cwd();

export function validateParsedKnowledge(
  parsed: ParsedKnowledgeDocument,
  status: string,
  version: string,
  expectedParts?: number,
  expectedChapters?: number,
): KnowledgeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (parsed.parts.length === 0) errors.push('Document must contain at least one part.');
  if (parsed.chapters.length === 0) errors.push('Document must contain at least one chapter.');
  if (!status.trim()) errors.push('Document status is required.');
  if (!version.trim()) errors.push('Document version is required.');
  if (parsed.parts.some((part) => !part.detected)) warnings.push('One or more chapters have no detected part heading.');
  if (expectedParts && parsed.parts.length !== expectedParts) {
    warnings.push(`Expected ${expectedParts} parts but produced ${parsed.parts.length}.`);
  }
  if (expectedChapters && parsed.chapters.length !== expectedChapters) {
    warnings.push(`Expected ${expectedChapters} chapters but produced ${parsed.chapters.length}.`);
  }

  const chapterNumbers = new Map<string, number>();
  for (const chapter of parsed.chapters) {
    if (!chapter.chapterNumber) errors.push(`Chapter ${chapter.chapterId} has no chapter number.`);
    if (!chapter.content.trim()) errors.push(`Chapter ${chapter.chapterId} is empty.`);
    if (chapter.wordCount < 20) warnings.push(`Chapter ${chapter.chapterNumber} is very small (${chapter.wordCount} words).`);
    if (chapter.wordCount > 20000) warnings.push(`Chapter ${chapter.chapterNumber} is very large (${chapter.wordCount} words).`);
    chapterNumbers.set(chapter.chapterNumber, (chapterNumbers.get(chapter.chapterNumber) ?? 0) + 1);
  }
  for (const [number, count] of chapterNumbers) {
    if (count > 1) warnings.push(`Chapter number ${number} appears ${count} times; unique chapter IDs were generated.`);
  }
  if (parsed.diagnostics.mergedContinuationCount > 0) {
    warnings.push(`Merged ${parsed.diagnostics.mergedContinuationCount} continuation boundary marker(s).`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

async function fileExists(relativePath: string) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function validateKnowledgePackage(packageData: KnowledgePackage): Promise<KnowledgeValidationResult> {
  const errors = [...packageData.validation.errors];
  const warnings = [...packageData.validation.warnings];
  if (!await fileExists(`${packageData.filePath}/metadata.json`)) errors.push('metadata.json is missing.');
  if (!await fileExists(packageData.exportPath)) errors.push(`Export file is missing: ${packageData.exportPath}`);
  for (const chapter of packageData.chapters) {
    if (!await fileExists(chapter.filePath)) errors.push(`Chapter file is missing: ${chapter.filePath}`);
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
