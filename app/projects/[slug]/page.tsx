import Link from 'next/link';
import { getProjectDeliverables } from '@/lib/hwos';

export default async function ProjectWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deliverables = await getProjectDeliverables(slug);
  return <div className="space-y-6"><h1 className="text-3xl font-bold">{slug}</h1><div className="grid gap-4 md:grid-cols-2"><Link className="rounded-2xl bg-white p-6 shadow-sm" href={`/projects/${slug}/research`}><h2 className="text-xl font-bold text-emerald-900">Research pipeline</h2><p className="mt-2 text-slate-600">Track and edit RD-01 through RD-11.</p></Link><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-emerald-900">Project files</h2><p className="mt-2 text-slate-600">Input files live in /projects/{slug}/input.</p></div></div><section className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Pipeline snapshot</h2><div className="mt-4 grid gap-2">{deliverables.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span>{item.id} · {item.title}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">{item.status}</span></div>)}</div></section></div>;
}
