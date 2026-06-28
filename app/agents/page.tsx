import Link from 'next/link';
import { ensureSeedContent, listMarkdownFiles } from '@/lib/hwos';

export default async function AgentsPage() {
  await ensureSeedContent();
  const files = await listMarkdownFiles('agents/research');
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Agent library</h1><Link href="/agents/registry" className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white">Agent registry</Link></div><p className="text-slate-600">Research agent definition files. TODO comments mark future AI execution integration points.</p><div className="grid gap-3">{files.map((file) => <Link className="rounded-2xl bg-white p-5 shadow-sm hover:text-emerald-800" href={`/agents/research/${encodeURIComponent(file.name)}`} key={file.name}>research/{file.name}</Link>)}</div></div>;
}
