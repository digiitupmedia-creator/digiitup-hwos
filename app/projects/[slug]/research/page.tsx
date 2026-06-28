import Link from 'next/link';
import { getProjectDeliverables } from '@/lib/hwos';

const badge: Record<string, string> = { Approved: 'bg-green-100 text-green-800', Blocked: 'bg-red-100 text-red-800', 'In Progress': 'bg-blue-100 text-blue-800', 'Draft Complete': 'bg-amber-100 text-amber-800', 'Not Started': 'bg-slate-100 text-slate-700' };

export default async function ResearchPipeline({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const deliverables = await getProjectDeliverables(slug);
  return <div className="space-y-6"><h1 className="text-3xl font-bold">Research pipeline</h1><p className="text-slate-600">TODO: AI pipeline execution controls will be added here after the workflow shell is validated.</p><div className="grid gap-3">{deliverables.map((item) => <Link key={item.id} href={`/projects/${slug}/research/${encodeURIComponent(item.fileName)}`} className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm hover:border-emerald-300 md:flex-row md:items-center"><div><p className="font-bold text-emerald-900">{item.id}: {item.title}</p><p className="text-sm text-slate-500">{item.fileName}</p></div><span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${badge[item.status]}`}>{item.status}</span></Link>)}</div></div>;
}
