import Link from 'next/link';
import { ensureSeedContent, listMarkdownFiles } from '@/lib/hwos';

export default async function AgentsPage() {
  await ensureSeedContent();
  const files = await listMarkdownFiles('agents/research');
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Agent library</h1><p className="text-slate-600">Research agent prompt files. TODO comments mark future AI execution integration points.</p><div className="grid gap-3">{files.map((file) => <Link className="rounded-2xl bg-white p-5 shadow-sm hover:text-emerald-800" href={`/agents/research/${encodeURIComponent(file.name)}`} key={file.name}>research/{file.name}</Link>)}</div></div>;
}
