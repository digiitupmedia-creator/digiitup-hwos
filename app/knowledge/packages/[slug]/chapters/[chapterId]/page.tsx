import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readKnowledgeChapter } from '@/lib/knowledge-engine/read-packages';

export default async function KnowledgeChapterPage({ params }: { params: { slug: string; chapterId: string } }) {
  const result = await readKnowledgeChapter(params.slug, params.chapterId).catch(() => null);
  if (!result) notFound();
  return <div className="space-y-5"><div><Link href={`/knowledge/packages/${encodeURIComponent(result.package.slug)}`} className="text-sm font-semibold text-emerald-800 hover:underline">← Back to package</Link><p className="mt-4 text-sm font-semibold text-emerald-700">{result.chapter.partTitle}</p><h1 className="mt-1 text-3xl font-bold">Chapter {result.chapter.chapterNumber}: {result.chapter.title}</h1><p className="mt-2 text-sm text-slate-500">{result.chapter.wordCount.toLocaleString()} words · {result.chapter.headingCount} headings · {result.chapter.status}</p></div><article className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-800">{result.content}</pre></article></div>;
}
