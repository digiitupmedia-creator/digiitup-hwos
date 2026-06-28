import Link from 'next/link';
import { ensureSeedContent, listMarkdownFiles } from '@/lib/hwos';
import { loadAgentRegistry } from '@/lib/registry';

export default async function AgentsPage() {
  await ensureSeedContent();
  const [files, registry] = await Promise.all([listMarkdownFiles('agents/research'), loadAgentRegistry()]);
  const agents = [...registry.agents].sort((a, b) => a.executionOrder - b.executionOrder);
  return <div className="space-y-8"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">Agent library</h1><Link href="/agents/registry" className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white">Agent registry</Link></div><section className="space-y-3"><h2 className="text-xl font-bold">Agent Inspectors</h2><div className="grid gap-3 md:grid-cols-2">{agents.map((agent) => <Link className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:border-emerald-300" href={`/agents/inspect/${encodeURIComponent(agent.id)}`} key={agent.id}><p className="font-semibold text-emerald-900">{agent.name}</p><p className="mt-1 text-sm text-slate-500">{agent.id}</p></Link>)}</div></section><section className="space-y-3"><h2 className="text-xl font-bold">Raw Markdown agent files</h2><p className="text-slate-600">Existing instruction files remain available for direct inspection. No agent execution is enabled.</p><div className="grid gap-3">{files.map((file) => <Link className="rounded-2xl bg-white p-5 shadow-sm hover:text-emerald-800" href={`/agents/research/${encodeURIComponent(file.name)}`} key={file.name}>research/{file.name}</Link>)}</div></section></div>;
}
