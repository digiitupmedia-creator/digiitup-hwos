import { MarkdownEditor } from '@/components/MarkdownEditor';
import { readMarkdown } from '@/lib/hwos';

export default async function KnowledgeEditor({ params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const filePath = `knowledge/${decodeURIComponent(file)}`;
  const content = await readMarkdown(filePath);
  return <div className="space-y-4"><h1 className="text-3xl font-bold">{decodeURIComponent(file)}</h1><MarkdownEditor filePath={filePath} content={content} /></div>;
}
