import { MarkdownEditor } from '@/components/MarkdownEditor';
import { readMarkdown } from '@/lib/hwos';

export default async function AgentEditor({ params }: { params: Promise<{ file: string[] }> }) {
  const { file } = await params;
  const filePath = `agents/${file.map(decodeURIComponent).join('/')}`;
  const content = await readMarkdown(filePath);
  return <div className="space-y-4"><h1 className="text-3xl font-bold">{file.join('/')}</h1><MarkdownEditor filePath={filePath} content={content} /></div>;
}
