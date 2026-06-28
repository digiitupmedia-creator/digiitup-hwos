import { MarkdownEditor } from '@/components/MarkdownEditor';
import { readMarkdown } from '@/lib/hwos';

export default async function DeliverableEditor({ params }: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await params;
  const filePath = `projects/${slug}/research/${decodeURIComponent(file)}`;
  const content = await readMarkdown(filePath);
  return <div className="space-y-4"><h1 className="text-3xl font-bold">{decodeURIComponent(file)}</h1><MarkdownEditor filePath={filePath} content={content} /></div>;
}
