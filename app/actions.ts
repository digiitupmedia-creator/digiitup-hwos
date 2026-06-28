'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createProject, isReadOnlyMode, updateResearchStatus, writeMarkdown } from '@/lib/hwos';

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
