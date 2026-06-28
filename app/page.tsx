import Link from 'next/link';
import { ensureSeedContent, listProjects } from '@/lib/hwos';

export default async function Dashboard() {
  await ensureSeedContent();
  const projects = await listProjects();
  return <div className="space-y-8"><section className="rounded-3xl bg-emerald-900 p-8 text-white shadow-sm"><p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Internal MVP v0.1</p><h1 className="mt-3 text-4xl font-bold">Digiitup Healthcare Website Operating System</h1><p className="mt-4 max-w-3xl text-emerald-50">Workflow shell for repository-based healthcare website production. File-backed Markdown and JSON-ready project workspace, no database, no authentication, and no AI automation yet.</p><div className="mt-6 flex gap-3"><Link className="rounded-full bg-white px-5 py-2 font-semibold text-emerald-900" href="/projects/new">Create project</Link><Link className="rounded-full border border-white/40 px-5 py-2 font-semibold" href="/projects">View projects</Link></div></section><section className="grid gap-4 md:grid-cols-3"><Card title="Projects" value={projects.length.toString()} text="Active repository workspaces" /><Card title="Research Pipeline" value="RD-01 → RD-11" text="Editable deliverable chain" /><Card title="AI Automation" value="TODO" text="Placeholders only for v0.1" /></section></div>;
}

function Card({ title, value, text }: { title: string; value: string; text: string }) { return <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"><p className="text-sm font-semibold text-emerald-700">{title}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p><p className="mt-2 text-slate-600">{text}</p></div>; }
