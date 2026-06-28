import type { Metadata } from 'next';
import Link from 'next/link';
import { isReadOnlyMode, readOnlyMessage } from '@/lib/hwos';
import './globals.css';

export const metadata: Metadata = { title: 'Digiitup HWOS', description: 'Healthcare Website Operating System MVP' };

const nav = [
  ['Dashboard', '/'], ['Projects', '/projects'], ['Create Project', '/projects/new'], ['Knowledge', '/knowledge'], ['Agents', '/agents'], ['Context', '/context-preview'],
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="min-h-screen"><header className="border-b border-emerald-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"><Link href="/" className="text-xl font-bold text-emerald-900">Digiitup HWOS</Link><nav className="flex flex-wrap gap-2">{nav.map(([label, href]) => <Link key={href} href={href} className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100">{label}</Link>)}</nav></div></header>{isReadOnlyMode && <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-center text-sm font-medium text-amber-900">{readOnlyMessage}</div>}<main className="mx-auto max-w-7xl px-6 py-8">{children}</main></div></body></html>;
}
