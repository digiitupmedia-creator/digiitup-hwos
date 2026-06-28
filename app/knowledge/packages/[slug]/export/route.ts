import { readKnowledgeExport } from '@/lib/knowledge-engine/read-packages';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  try {
    const result = await readKnowledgeExport(params.slug);
    return new Response(result.content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `inline; filename="${result.package.slug}.md"`,
      },
    });
  } catch {
    return new Response('Knowledge export not found.', { status: 404 });
  }
}
