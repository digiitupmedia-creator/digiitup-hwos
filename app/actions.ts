'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createProject, writeMarkdown } from '@/lib/hwos';

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get('name') ?? '');
  const slug = await createProject(name);
  revalidatePath('/projects');
  redirect(`/projects/${slug}`);
}

export async function saveMarkdownAction(formData: FormData) {
  const filePath = String(formData.get('filePath') ?? '');
  const content = String(formData.get('content') ?? '');
  await writeMarkdown(filePath, content);
  revalidatePath('/projects');
  revalidatePath('/knowledge');
  revalidatePath('/agents');
}
