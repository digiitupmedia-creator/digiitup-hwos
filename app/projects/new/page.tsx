import { createProjectAction } from '@/app/actions';
import { isReadOnlyMode, readOnlyMessage } from '@/lib/hwos';

export default function NewProjectPage() {
  return <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">Create project</h1><p className="mt-2 text-slate-600">Creates the complete input and RD-01 to RD-11 research folder structure in the repository.</p>{isReadOnlyMode && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{readOnlyMessage}</p>}<form action={isReadOnlyMode ? undefined : createProjectAction} className="mt-6 space-y-4"><label className="block"><span className="font-semibold">Project name</span><input name="name" required disabled={isReadOnlyMode} className="mt-2 w-full rounded-xl border border-emerald-100 p-3 outline-none focus:border-emerald-400 disabled:bg-slate-100" placeholder="Example: Green Valley Cardiology" /></label><button disabled={isReadOnlyMode} className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">Create workspace</button></form></div>;
}
