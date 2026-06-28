import Link from 'next/link';
import { ensureSeedContent, listMarkdownFiles } from '@/lib/hwos';

export default async function KnowledgePage() {
  await ensureSeedContent();
  const files = await listMarkdownFiles('knowledge');
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Knowledge library</h1><Link href="/knowledge/registry" className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white">Knowledge registry</Link></div><Library files={files} base="/knowledge" /></div>;
}

function Library({ files, base }: { files: { name: string }[]; base: string }) { return <div className="grid gap-3">{files.map((file) => <Link className="rounded-2xl bg-white p-5 shadow-sm hover:text-emerald-800" href={`${base}/${encodeURIComponent(file.name)}`} key={file.name}>{file.name}</Link>)}</div>; }
