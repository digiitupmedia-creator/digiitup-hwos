import { promises as fs } from 'fs';
import path from 'path';
import { loadKnowledgeRegistry, loadResearchWorkflow, resolveProjectPath } from '@/lib/registry';

const rootDir = process.cwd();

export type ProjectContext = {
  projectName: string;
  organization: string;
  specialty: string;
  status: 'Active' | 'Completed' | 'Blocked';
  currentRDStage: string;
  completedDeliverables: string[];
  currentAgent: string | null;
  currentKnowledgeSnapshot: {
    canonicalKnowledge: { id: string; version: string }[];
    approvedDeliverables: string[];
  };
};

async function canonicalVersions() {
  const registry = await loadKnowledgeRegistry();
  return registry.documents
    .filter((document) => document.category === 'canonical-knowledge')
    .map(({ id, version }) => ({ id, version }));
}

export async function createProjectContext(projectSlug: string, projectName: string): Promise<ProjectContext> {
  const contextPath = path.join(rootDir, 'projects', projectSlug, 'project-context.json');
  try {
    return JSON.parse(await fs.readFile(contextPath, 'utf8')) as ProjectContext;
  } catch {
    // Initialize projects that predate the runtime context file.
  }
  const workflow = await loadResearchWorkflow();
  const firstStage = [...workflow.stages].sort((a, b) => a.stageId.localeCompare(b.stageId))[0];
  const context: ProjectContext = {
    projectName,
    organization: '',
    specialty: '',
    status: 'Active',
    currentRDStage: firstStage.stageId,
    completedDeliverables: [],
    currentAgent: firstStage.agent,
    currentKnowledgeSnapshot: {
      canonicalKnowledge: await canonicalVersions(),
      approvedDeliverables: [],
    },
  };
  await fs.writeFile(
    contextPath,
    `${JSON.stringify(context, null, 2)}\n`,
    'utf8',
  );
  await fs.mkdir(path.join(rootDir, 'projects', projectSlug, 'knowledge-snapshots'), { recursive: true });
  return context;
}

async function readProjectContext(projectSlug: string): Promise<ProjectContext> {
  const contextPath = path.join(rootDir, 'projects', projectSlug, 'project-context.json');
  try {
    return JSON.parse(await fs.readFile(contextPath, 'utf8')) as ProjectContext;
  } catch {
    return createProjectContext(projectSlug, projectSlug);
  }
}

async function createApprovalSnapshot(projectSlug: string, deliverableId: string) {
  const [workflow, knowledge] = await Promise.all([loadResearchWorkflow(), loadKnowledgeRegistry()]);
  const stage = workflow.stages.find((item) => item.stageId === deliverableId);
  if (!stage) throw new Error(`Workflow stage "${deliverableId}" is not registered.`);
  const sourcePath = resolveProjectPath(stage.outputPath, projectSlug);
  const content = await fs.readFile(path.join(rootDir, sourcePath), 'utf8');
  const snapshot = {
    deliverableId,
    sourcePath,
    approvedAt: new Date().toISOString(),
    immutable: true,
    knowledgeVersions: knowledge.documents.map(({ id, version }) => ({ id, version })),
    content,
  };
  const snapshotDir = path.join(rootDir, 'projects', projectSlug, 'knowledge-snapshots');
  await fs.mkdir(snapshotDir, { recursive: true });
  try {
    const snapshotPath = path.join(snapshotDir, `${deliverableId}.json`);
    await fs.writeFile(
      snapshotPath,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
    await fs.chmod(snapshotPath, 0o444);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
}

export async function updateProjectRuntime(
  projectSlug: string,
  deliverableId: string,
  status: string,
  completedDeliverables: string[],
) {
  const [context, workflow] = await Promise.all([
    readProjectContext(projectSlug),
    loadResearchWorkflow(),
  ]);
  const stage = workflow.stages.find((item) => item.stageId === deliverableId);
  if (!stage) throw new Error(`Workflow stage "${deliverableId}" is not registered.`);

  if (status === 'Approved') await createApprovalSnapshot(projectSlug, deliverableId);
  const nextStage = status === 'Approved' && stage.nextStage
    ? workflow.stages.find((item) => item.stageId === stage.nextStage)
    : stage;
  context.status = status === 'Blocked' ? 'Blocked' : stage.nextStage === null && status === 'Approved' ? 'Completed' : 'Active';
  context.currentRDStage = nextStage?.stageId ?? deliverableId;
  context.currentAgent = context.status === 'Completed' ? null : nextStage?.agent ?? stage.agent;
  context.completedDeliverables = completedDeliverables;
  context.currentKnowledgeSnapshot = {
    canonicalKnowledge: await canonicalVersions(),
    approvedDeliverables: completedDeliverables,
  };
  await fs.writeFile(
    path.join(rootDir, 'projects', projectSlug, 'project-context.json'),
    `${JSON.stringify(context, null, 2)}\n`,
    'utf8',
  );
}
