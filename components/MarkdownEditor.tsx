import { saveMarkdownAction } from '@/app/actions';

export function MarkdownEditor({ filePath, content }: { filePath: string; content: string }) {
  return (
    <form action={saveMarkdownAction} className="space-y-4">
      <input type="hidden" name="filePath" value={filePath} />
      <textarea name="content" defaultValue={content} className="min-h-[560px] w-full rounded-2xl border border-emerald-100 bg-white p-5 text-sm leading-6 shadow-sm outline-none focus:border-emerald-400" />
      <button className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800">Save Markdown</button>
    </form>
  );
}
