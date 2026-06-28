import { promises as fs } from 'fs';
import path from 'path';
import {
  AgentDefinition,
  KnowledgeDocument,
  loadAgentRegistry,
  loadKnowledgeRegistry,
  loadResearchWorkflow,
  resolveProjectPath,
} from '@/lib/registry';
import { validateAgentContext } from '@/lib/validation';

const rootDir = process.cwd();

export type LoadedDocument = KnowledgeDocument & {
  content: string | null;
  exists: boolean;
};

export type LoadedFile = {
  id: string;
  filePath: string;
  content: string | null;
  exists: boolean;
  source: 'project-file' | 'working-deliverable' | 'approved-snapshot' | 'unresolved';
};

async function loadFile(id: string, filePath: string, source: LoadedFile['source']): Promise<LoadedFile> {
  if (filePath.includes('{projectSlug}')) return { id, filePath, content: null, exists: false, source: 'unresolved' };
  try {
    const content = await fs.readFile(path.join(rootDir, filePath), 'utf8');
    return { id, filePath, content, exists: true, source };
  } catch {
    return { id, filePath, content: null, exists: false, source };
  }
}

async function loadDocument(document: KnowledgeDocument): Promise<LoadedDocument> {
  try {
    const content = await fs.readFile(path.join(rootDir, document.filePath), 'utf8');
    return { ...document, content, exists: true };
  } catch {
    return { ...document, content: null, exists: false };
  }
}

function expandDocumentIds(ids: string[], documents: KnowledgeDocument[]) {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const expanded = new Set<string>();
  const visit = (id: string) => {
    if (expanded.has(id)) return;
    expanded.add(id);
    byId.get(id)?.dependencies.forEach(visit);
  };
  ids.forEach(visit);
  return [...expanded];
}

export async function loadAgentContext(agentId: string, projectSlug?: string) {
  const [agentRegistry, knowledgeRegistry, workflow] = await Promise.all([
    loadAgentRegistry(),
    loadKnowledgeRegistry(),
    loadResearchWorkflow(),
  ]);
  const agent = agentRegistry.agents.find((item) => item.id === agentId);
  if (!agent) throw new Error(`Agent "${agentId}" is not registered.`);

  const documentById = new Map(knowledgeRegistry.documents.map((document) => [document.id, document]));
  const knowledgeIds = expandDocumentIds(agent.requiredKnowledge, knowledgeRegistry.documents);
  const architectureIds = expandDocumentIds(agent.requiredArchitectures, knowledgeRegistry.documents);
  const registeredDocumentIds = agent.requiredDocuments.filter((item) => documentById.has(item));
  const dependencyIds = expandDocumentIds(registeredDocumentIds, knowledgeRegistry.documents);

  const knowledge = await Promise.all(knowledgeIds.map((id) => loadDocument(documentById.get(id)!)));
  const architectures = await Promise.all(architectureIds.map((id) => loadDocument(documentById.get(id)!)));
  const documents = await Promise.all(dependencyIds.map((id) => loadDocument(documentById.get(id)!)));
  const projectFiles = await Promise.all(agent.requiredDocuments
    .filter((item) => !documentById.has(item))
    .map((filePath) => loadFile(filePath, resolveProjectPath(filePath, projectSlug), 'project-file')));

  const stageById = new Map(workflow.stages.map((stage) => [stage.stageId, stage]));
  const requiredDeliverables = await Promise.all(agent.inputDeliverables.map(async (id) => {
    const stage = stageById.get(id);
    if (!stage) return loadFile(id, id, 'unresolved');
    const snapshotPath = projectSlug ? `projects/${projectSlug}/knowledge-snapshots/${id}.json` : '';
    if (snapshotPath) {
      const snapshot = await loadFile(id, snapshotPath, 'approved-snapshot');
      if (snapshot.exists && snapshot.content) {
        try {
          const parsed = JSON.parse(snapshot.content) as { content?: string };
          return { ...snapshot, content: parsed.content ?? snapshot.content };
        } catch {
          return snapshot;
        }
      }
    }
    return loadFile(id, resolveProjectPath(stage.outputPath, projectSlug), 'working-deliverable');
  }));
  const expectedOutputs = await Promise.all(agent.outputDeliverables.map((id) => {
    const stage = stageById.get(id);
    return loadFile(id, stage ? resolveProjectPath(stage.outputPath, projectSlug) : id, stage ? 'working-deliverable' : 'unresolved');
  }));
  const validation = await validateAgentContext(agent, projectSlug);

  return {
    agent,
    knowledge,
    architectures,
    projectFiles,
    deliverables: {
      required: requiredDeliverables,
      previousOutputs: requiredDeliverables,
      expectedOutputs,
    },
    dependencies: {
      documents,
      knowledgeIds,
      architectureIds,
      downstreamAgent: agent.downstreamAgent,
      validation,
    },
  };
}

export type AgentContextPackage = Awaited<ReturnType<typeof loadAgentContext>>;
