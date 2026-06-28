'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createProject, isReadOnlyMode, updateResearchStatus, writeMarkdown } from '@/lib/hwos';
import { importKnowledge } from '@/lib/knowledge-engine/import-knowledge';

export async function createProjectAction(formData: FormData) {
  if (isReadOnlyMode) return;
  const name = String(formData.get('name') ?? '');
  const slug = await createProject(name);
  revalidatePath('/projects');
  redirect(`/projects/${slug}`);
}

export async function saveMarkdownAction(formData: FormData) {
  if (isReadOnlyMode) return;
  const filePath = String(formData.get('filePath') ?? '');
  const content = String(formData.get('content') ?? '');
  await writeMarkdown(filePath, content);
  revalidatePath('/projects');
  revalidatePath('/knowledge');
  revalidatePath('/agents');
}

export async function updateResearchStatusAction(formData: FormData) {
  if (isReadOnlyMode) return;
  const slug = String(formData.get('slug') ?? '');
  const deliverableId = String(formData.get('deliverableId') ?? '');
  const status = String(formData.get('status') ?? '');
  await updateResearchStatus(slug, deliverableId, status);
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/research`);
}

export async function importKnowledgeAction(formData: FormData) {
  if (isReadOnlyMode) {
    redirect(`/knowledge/import?error=${encodeURIComponent('Knowledge import is available only in local development.')}`);
  }
  const expectedParts = Number(formData.get('expectedParts'));
  const expectedChapters = Number(formData.get('expectedChapters'));
  const result = await importKnowledge({
    documentId: String(formData.get('documentId') ?? ''),
    title: String(formData.get('title') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    version: String(formData.get('version') ?? ''),
    status: String(formData.get('status') ?? ''),
    sourceFileName: String(formData.get('sourceFileName') ?? ''),
    rawMarkdown: String(formData.get('rawMarkdown') ?? ''),
    expectedParts: Number.isInteger(expectedParts) && expectedParts > 0 ? expectedParts : undefined,
    expectedChapters: Number.isInteger(expectedChapters) && expectedChapters > 0 ? expectedChapters : undefined,
  });
  if (!result.success || !result.package) {
    const message = result.error ?? result.validation.errors.join(' ') ?? 'Knowledge import failed.';
    redirect(`/knowledge/import?error=${encodeURIComponent(message)}`);
  }
  revalidatePath('/knowledge/packages');
  redirect(`/knowledge/packages/${result.package.slug}?imported=1`);
}
