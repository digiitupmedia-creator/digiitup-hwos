import { promises as fs } from 'fs';
import path from 'path';
import type { KnowledgePackage } from '@/lib/knowledge-engine/types';

const rootDir = process.cwd();
const documentsDir = path.join(rootDir, 'knowledge', 'documents');

function assertSafeSegment(value: string, label: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error(`Invalid ${label}.`);
}

export async function listKnowledgePackages(): Promise<KnowledgePackage[]> {
  const entries = await fs.readdir(documentsDir, { withFileTypes: true }).catch(() => []);
  const packages = await Promise.all(entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => readKnowledgePackage(entry.name).catch(() => null)));
  return packages.filter((item): item is KnowledgePackage => item !== null)
    .sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export async function readKnowledgePackage(slug: string): Promise<KnowledgePackage> {
  assertSafeSegment(slug, 'package slug');
  return JSON.parse(await fs.readFile(path.join(documentsDir, slug, 'metadata.json'), 'utf8')) as KnowledgePackage;
}

export async function readKnowledgeChapter(slug: string, chapterId: string) {
  assertSafeSegment(slug, 'package slug');
  assertSafeSegment(chapterId, 'chapter ID');
  const packageData = await readKnowledgePackage(slug);
  const chapter = packageData.chapters.find((item) => item.chapterId === chapterId);
  if (!chapter) throw new Error(`Chapter ${chapterId} is not registered in package ${slug}.`);
  const content = await fs.readFile(path.join(rootDir, chapter.filePath), 'utf8');
  return { package: packageData, chapter, content };
}

export async function readKnowledgeExport(slug: string) {
  const packageData = await readKnowledgePackage(slug);
  return { package: packageData, content: await fs.readFile(path.join(rootDir, packageData.exportPath), 'utf8') };
}
