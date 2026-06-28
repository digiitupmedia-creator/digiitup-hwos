import { promises as fs } from 'fs';
import path from 'path';
import { parseMarkdown } from '@/lib/knowledge-engine/parse-markdown';
import type {
  KnowledgeImportInput,
  KnowledgeImportResult,
  KnowledgePackage,
} from '@/lib/knowledge-engine/types';
import {
  validateKnowledgePackage,
  validateParsedKnowledge,
} from '@/lib/knowledge-engine/validate-knowledge';

const rootDir = process.cwd();

function validSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function tocFor(packageData: KnowledgePackage) {
  const chapters = new Map(packageData.chapters.map((chapter) => [chapter.chapterId, chapter]));
  const lines = [`# ${packageData.title}`, '', `Version: ${packageData.version}`, `Status: ${packageData.status}`, ''];
  for (const part of packageData.parts) {
    lines.push(`## ${part.title}`, '');
    for (const chapterId of part.chapterIds) {
      const chapter = chapters.get(chapterId);
      if (chapter) lines.push(`- [Chapter ${chapter.chapterNumber}: ${chapter.title}](${chapter.filePath.replace(`${packageData.filePath}/`, '')})`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export async function importKnowledge(input: KnowledgeImportInput): Promise<KnowledgeImportResult> {
  const version = input.version.trim().replace(/^v/i, '');
  const emptyValidation = { valid: false, errors: [] as string[], warnings: [] as string[] };
  if (!input.documentId.trim() || !input.title.trim() || !input.status.trim() || !input.sourceFileName.trim()) {
    return { success: false, validation: { ...emptyValidation, errors: ['Document ID, title, status, and source file name are required.'] }, error: 'Required import fields are missing.' };
  }
  if (!validSlug(input.slug)) {
    return { success: false, validation: { ...emptyValidation, errors: ['Slug must contain only lowercase letters, numbers, and single hyphens.'] }, error: 'Invalid package slug.' };
  }
  if (!input.rawMarkdown.trim()) {
    return { success: false, validation: { ...emptyValidation, errors: ['Markdown content is required.'] }, error: 'Markdown content is empty.' };
  }

  const packageRelativePath = `knowledge/documents/${input.slug}`;
  const finalPath = path.join(rootDir, packageRelativePath);
  try {
    await fs.access(finalPath);
    return { success: false, validation: { ...emptyValidation, errors: [`Knowledge package already exists: ${packageRelativePath}`] }, error: 'Existing knowledge packages are never overwritten.' };
  } catch {
    // The package is safe to create.
  }

  const parsed = parseMarkdown(input.rawMarkdown, input.status.trim());
  const validation = validateParsedKnowledge(parsed, input.status, version, input.expectedParts, input.expectedChapters);
  if (!validation.valid) return { success: false, validation, error: 'Markdown failed structural validation.' };

  const importedAt = new Date().toISOString();
  const exportPath = `${packageRelativePath}/export/${input.slug}.md`;
  const snapshotPath = `${packageRelativePath}/snapshots/v${version}/${input.slug}.md`;
  const tempPath = path.join(rootDir, 'knowledge', 'documents', `.import-${input.slug}-${Date.now()}`);
  const chapters = parsed.chapters.map((chapter) => ({
    ...chapter,
    filePath: `${packageRelativePath}/parts/${chapter.partId}/${chapter.chapterId}.md`,
  }));
  const packageData: KnowledgePackage = {
    documentId: input.documentId.trim(),
    title: input.title.trim(),
    slug: input.slug,
    version,
    status: input.status.trim(),
    sourceFileName: input.sourceFileName.trim(),
    importedAt,
    totalParts: parsed.parts.length,
    totalChapters: chapters.length,
    totalWordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
    expectedParts: input.expectedParts,
    expectedChapters: input.expectedChapters,
    filePath: packageRelativePath,
    exportPath,
    snapshotPath,
    parts: parsed.parts,
    chapters: chapters.map(({ content: _content, ...chapter }) => chapter),
    parserDiagnostics: parsed.diagnostics,
    validation,
  };

  try {
    await fs.mkdir(tempPath, { recursive: false });
    await Promise.all([
      fs.mkdir(path.join(tempPath, 'export'), { recursive: true }),
      fs.mkdir(path.join(tempPath, 'snapshots', `v${version}`), { recursive: true }),
      ...parsed.parts.map((part) => fs.mkdir(path.join(tempPath, 'parts', part.partId), { recursive: true })),
    ]);
    for (const chapter of chapters) {
      const chapterPath = path.join(tempPath, 'parts', chapter.partId, `${chapter.chapterId}.md`);
      await fs.writeFile(chapterPath, chapter.content, { encoding: 'utf8', flag: 'wx' });
      await fs.chmod(chapterPath, 0o444);
    }
    const exportFile = path.join(tempPath, 'export', `${input.slug}.md`);
    const snapshotFile = path.join(tempPath, 'snapshots', `v${version}`, `${input.slug}.md`);
    await fs.writeFile(exportFile, input.rawMarkdown, { encoding: 'utf8', flag: 'wx' });
    await fs.writeFile(snapshotFile, input.rawMarkdown, { encoding: 'utf8', flag: 'wx' });
    await fs.chmod(exportFile, 0o444);
    await fs.chmod(snapshotFile, 0o444);
    await fs.writeFile(path.join(tempPath, 'toc.md'), tocFor(packageData), 'utf8');
    await fs.writeFile(path.join(tempPath, 'metadata.json'), `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, finalPath);

    packageData.validation = await validateKnowledgePackage(packageData);
    await fs.writeFile(path.join(finalPath, 'metadata.json'), `${JSON.stringify(packageData, null, 2)}\n`, 'utf8');
    return { success: packageData.validation.valid, package: packageData, validation: packageData.validation };
  } catch (error) {
    await fs.rm(tempPath, { recursive: true, force: true }).catch(() => undefined);
    const message = error instanceof Error ? error.message : 'Unknown import error.';
    return { success: false, validation: { ...validation, valid: false, errors: [...validation.errors, message] }, error: message };
  }
}
