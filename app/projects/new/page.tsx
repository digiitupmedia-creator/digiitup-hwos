import { createProjectAction } from '@/app/actions';

export default function NewProjectPage() {
  return <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-sm"><h1 className="text-3xl font-bold">Create project</h1><p className="mt-2 text-slate-600">Creates the complete input and RD-01 to RD-11 research folder structure in the repository.</p><form action={createProjectAction} className="mt-6 space-y-4"><label className="block"><span className="font-semibold">Project name</span><input name="name" required className="mt-2 w-full rounded-xl border border-emerald-100 p-3 outline-none focus:border-emerald-400" placeholder="Example: Green Valley Cardiology" /></label><button className="rounded-full bg-emerald-700 px-5 py-2 font-semibold text-white">Create workspace</button></form></div>;
}
