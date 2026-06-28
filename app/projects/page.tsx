import Link from 'next/link';
import { listProjects } from '@/lib/hwos';

export default async function ProjectsPage() {
  const projects = await listProjects();
  return <div className="space-y-6"><div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Projects</h1><Link href="/projects/new" className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white">New project</Link></div><div className="grid gap-3">{projects.map((slug) => <Link key={slug} href={`/projects/${slug}`} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:border-emerald-300"><p className="font-semibold text-emerald-900">{slug}</p><p className="text-sm text-slate-600">Open workspace and research pipeline</p></Link>)}{projects.length === 0 && <p className="rounded-2xl bg-white p-6 text-slate-600">No projects yet.</p>}</div></div>;
}
