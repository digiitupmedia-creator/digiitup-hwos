import Link from 'next/link';
import { ensureSeedContent, listMarkdownFiles } from '@/lib/hwos';

export default async function KnowledgePage() {
  await ensureSeedContent();
  const files = await listMarkdownFiles('knowledge');
  return <Library title="Knowledge library" files={files} base="/knowledge" />;
}

function Library({ title, files, base }: { title: string; files: { name: string }[]; base: string }) { return <div className="space-y-6"><h1 className="text-3xl font-bold">{title}</h1><div className="grid gap-3">{files.map((file) => <Link className="rounded-2xl bg-white p-5 shadow-sm hover:text-emerald-800" href={`${base}/${encodeURIComponent(file.name)}`} key={file.name}>{file.name}</Link>)}</div></div>; }
