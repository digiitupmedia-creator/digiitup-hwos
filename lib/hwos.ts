import { promises as fs } from 'fs';
import path from 'path';

export const rootDir = process.cwd();
export const isReadOnlyMode = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
export const readOnlyMessage = 'HWOS v0.1 is file-based and must be run locally. Production storage will be added in v0.2.';

export const pipelineStatuses = [
  'Not Started',
  'In Progress',
  'Draft Complete',
  'Approved',
  'Blocked',
] as const;

export type PipelineStatus = (typeof pipelineStatuses)[number];

export type Deliverable = {
  id: string;
  title: string;
  fileName: string;
  status: PipelineStatus;
};

export type ResearchStatusMap = Record<string, PipelineStatus>;

export const researchDeliverables: Omit<Deliverable, 'status'>[] = [
  { id: 'RD-01', title: 'Research Execution Plan', fileName: 'RD-01-research-execution-plan.md' },
  { id: 'RD-02', title: 'Research Intake Register', fileName: 'RD-02-research-intake-register.md' },
  { id: 'RD-03', title: 'Discovery Findings Register', fileName: 'RD-03-discovery-findings-register.md' },
  { id: 'RD-04', title: 'Evidence Register', fileName: 'RD-04-evidence-register.md' },
  { id: 'RD-05', title: 'Knowledge Extraction Register', fileName: 'RD-05-knowledge-extraction-register.md' },
  { id: 'RD-06', title: 'Knowledge Structure Map', fileName: 'RD-06-knowledge-structure-map.md' },
  { id: 'RD-07', title: 'Validation Report', fileName: 'RD-07-validation-report.md' },
  { id: 'RD-08', title: 'Knowledge Gap Register', fileName: 'RD-08-knowledge-gap-register.md' },
  { id: 'RD-09', title: 'Healthcare Knowledge Package', fileName: 'RD-09-healthcare-knowledge-package.md' },
  { id: 'RD-10', title: 'HKP QA Report', fileName: 'RD-10-hkp-qa-report.md' },
  { id: 'RD-11', title: 'Research Approval Report', fileName: 'RD-11-research-approval-report.md' },
];

const inputFiles = ['project-brief.md', 'client-notes.md', 'links.md'];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function projectDir(slug: string) {
  return path.join(rootDir, 'projects', slug);
}

function defaultResearchStatuses(): ResearchStatusMap {
  return Object.fromEntries(
    researchDeliverables.map((item) => [item.id, 'Not Started']),
  ) as ResearchStatusMap;
}

function validateProjectSlug(slug: string) {
  if (slug !== slugify(slug)) throw new Error('Invalid project slug');
}

export async function ensureSeedContent() {
  if (isReadOnlyMode) return;
  await Promise.all([
    writeIfMissing('knowledge/01-healthcare-patient-psychology.md', '# Healthcare Patient Psychology\n\nCore reference notes for healthcare patient needs, fears, trust signals, and conversion motivations.\n'),
    writeIfMissing('knowledge/02-healthcare-decision-journey.md', '# Healthcare Decision Journey\n\nReusable journey model from symptom awareness to provider selection and appointment request.\n'),
    writeIfMissing('knowledge/03-universal-healthcare-information-model.md', '# Universal Healthcare Information Model\n\nShared information model for services, conditions, providers, locations, proof, FAQs, and calls to action.\n'),
    writeIfMissing('knowledge/04-universal-healthcare-website-architecture.md', '# Universal Healthcare Website Architecture\n\nBaseline sitemap and page-section architecture for healthcare websites.\n'),
    writeIfMissing('departments/research/research-department-architecture.md', '# Research Department Architecture\n\nDefines the research department workflow, responsibilities, handoffs, and quality controls.\n'),
    writeIfMissing('departments/research/research-deliverable-map.md', '# Research Deliverable Map\n\nMaps RD-01 through RD-11 to internal research outcomes.\n'),
    writeIfMissing('agents/research/00-department-manager.md', '# Research Department Manager\n\nCoordinates research workflow status and approvals.\n\nTODO: Add AI execution prompts and routing in a later release.\n'),
    writeIfMissing('agents/research/01-research-planning-agent.md', '# Research Planning Agent\n\nPlans research execution from project inputs.\n\nTODO: Add AI-assisted planning in a later release.\n'),
    writeIfMissing('agents/research/02-research-intake-agent.md', '# Research Intake Agent\n\nStructures incoming client notes, links, and discovery material.\n\nTODO: Add AI-assisted intake parsing in a later release.\n'),
  ]);
}

async function writeIfMissing(relativePath: string, content: string) {
  const fullPath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  try { await fs.access(fullPath); } catch { await fs.writeFile(fullPath, content); }
}

export async function listMarkdownFiles(relativeDir: string) {
  const dir = path.join(rootDir, relativeDir);
  const files = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return files.filter((file) => file.isFile() && file.name.endsWith('.md')).map((file) => ({
    name: file.name,
    path: `${relativeDir}/${file.name}`,
  }));
}

export async function readMarkdown(relativePath: string) {
  return fs.readFile(path.join(rootDir, relativePath), 'utf8');
}

export async function writeMarkdown(relativePath: string, content: string) {
  if (isReadOnlyMode) return;
  if (!relativePath.endsWith('.md') || relativePath.includes('..')) throw new Error('Invalid Markdown path');
  await fs.writeFile(path.join(rootDir, relativePath), content);
}

export async function listProjects() {
  const dir = path.join(rootDir, 'projects');
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

export async function createProject(name: string) {
  const slug = slugify(name);
  if (!slug) throw new Error('Project name must contain letters or numbers.');
  if (isReadOnlyMode) return slug;
  const base = projectDir(slug);
  await fs.mkdir(path.join(base, 'input'), { recursive: true });
  await fs.mkdir(path.join(base, 'research'), { recursive: true });
  await Promise.all(inputFiles.map((file) => writeIfMissing(`projects/${slug}/input/${file}`, `# ${file.replace('.md', '').replaceAll('-', ' ')}\n\n`)));
  await Promise.all(researchDeliverables.map((item) => writeIfMissing(`projects/${slug}/research/${item.fileName}`, `# ${item.id}: ${item.title}\n\n## Notes\n\nTODO: AI execution support will populate this deliverable in a later release.\n`)));
  await writeIfMissing(
    `projects/${slug}/research/status.json`,
    `${JSON.stringify(defaultResearchStatuses(), null, 2)}\n`,
  );
  return slug;
}

export async function getProjectDeliverables(slug: string): Promise<Deliverable[]> {
  const statuses = await readResearchStatuses(slug);
  return researchDeliverables.map((item) => ({ ...item, status: statuses[item.id] }));
}

export async function readResearchStatuses(slug: string): Promise<ResearchStatusMap> {
  validateProjectSlug(slug);
  const statusPath = path.join(projectDir(slug), 'research', 'status.json');
  const defaults = defaultResearchStatuses();

  let saved: unknown = {};
  try {
    saved = JSON.parse(await fs.readFile(statusPath, 'utf8'));
  } catch {
    // Missing or invalid status files are repaired with safe defaults.
  }

  const values = saved && typeof saved === 'object' ? saved as Record<string, unknown> : {};
  const statuses = Object.fromEntries(researchDeliverables.map((item) => {
    const value = values[item.id];
    return [item.id, pipelineStatuses.includes(value as PipelineStatus) ? value : defaults[item.id]];
  })) as ResearchStatusMap;

  if (!isReadOnlyMode) {
    await fs.mkdir(path.dirname(statusPath), { recursive: true });
    await fs.writeFile(statusPath, `${JSON.stringify(statuses, null, 2)}\n`, 'utf8');
  }
  return statuses;
}

export async function updateResearchStatus(slug: string, deliverableId: string, status: string) {
  if (isReadOnlyMode) return;
  validateProjectSlug(slug);
  if (!researchDeliverables.some((item) => item.id === deliverableId)) throw new Error('Invalid deliverable');
  if (!pipelineStatuses.includes(status as PipelineStatus)) throw new Error('Invalid status');

  const statuses = await readResearchStatuses(slug);
  statuses[deliverableId] = status as PipelineStatus;
  const statusPath = path.join(projectDir(slug), 'research', 'status.json');
  await fs.writeFile(statusPath, `${JSON.stringify(statuses, null, 2)}\n`, 'utf8');
}
