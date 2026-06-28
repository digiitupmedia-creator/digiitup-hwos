import { updateResearchStatusAction } from '@/app/actions';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { getProjectDeliverables, isReadOnlyMode, pipelineStatuses, readMarkdown, readOnlyMessage } from '@/lib/hwos';

export default async function DeliverableEditor({ params }: { params: { slug: string; file: string } }) {
  const { slug, file } = params;
  const filePath = `projects/${slug}/research/${decodeURIComponent(file)}`;
  const [content, deliverables] = await Promise.all([
    readMarkdown(filePath),
    getProjectDeliverables(slug),
  ]);
  const deliverable = deliverables.find((item) => item.fileName === decodeURIComponent(file));
  if (!deliverable) throw new Error('Unknown research deliverable');

  return <div className="space-y-4"><h1 className="text-3xl font-bold">{decodeURIComponent(file)}</h1><form action={isReadOnlyMode ? undefined : updateResearchStatusAction} className="flex flex-wrap items-end gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><input type="hidden" name="slug" value={slug} /><input type="hidden" name="deliverableId" value={deliverable.id} /><label><span className="block text-sm font-semibold text-emerald-900">Status</span><select name="status" defaultValue={deliverable.status} disabled={isReadOnlyMode} className="mt-2 rounded-xl border border-emerald-100 bg-white p-3 outline-none focus:border-emerald-400 disabled:bg-slate-100">{pipelineStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><button disabled={isReadOnlyMode} className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400">Update status</button>{isReadOnlyMode && <p className="w-full text-sm text-amber-900">{readOnlyMessage}</p>}</form><MarkdownEditor filePath={filePath} content={content} /></div>;
}
