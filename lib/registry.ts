import { promises as fs } from 'fs';
import path from 'path';

const rootDir = process.cwd();

export type KnowledgeDocument = {
  id: string;
  title: string;
  version: string;
  status: string;
  category: string;
  filePath?: string;
  description: string;
  dependencies: string[];
  ownedBy: string;
  immutable: boolean;
  packageType?: 'single-file' | 'multi-chapter';
  packagePath?: string;
  packageSlug?: string;
};

export type KnowledgeRegistry = {
  version: string;
  documents: KnowledgeDocument[];
};

export type AgentDefinition = {
  id: string;
  name: string;
  department: string;
  role: string;
  instructionFile: string | null;
  inputDeliverables: string[];
  outputDeliverables: string[];
  requiredKnowledge: string[];
  requiredArchitectures: string[];
  requiredDocuments: string[];
  downstreamAgent: string | null;
  executionOrder: number;
  status: string;
};

export type AgentRegistry = {
  version: string;
  agents: AgentDefinition[];
};

export type WorkflowStage = {
  stageId: string;
  agent: string;
  requiredInputs: string[];
  expectedOutputs: string[];
  outputPath: string;
  validationGate: string;
  nextStage: string | null;
  failureRoute: string;
  parallelEligible: boolean;
};

export type WorkflowRegistry = {
  id: string;
  version: string;
  department: string;
  stages: WorkflowStage[];
};

async function readRegistry<T>(relativePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(rootDir, relativePath), 'utf8')) as T;
}

export function loadKnowledgeRegistry() {
  return readRegistry<KnowledgeRegistry>('knowledge/knowledge-registry.json');
}

export function loadAgentRegistry() {
  return readRegistry<AgentRegistry>('agents/agent-registry.json');
}

export function loadResearchWorkflow() {
  return readRegistry<WorkflowRegistry>('workflow/research-workflow.json');
}

export function resolveProjectPath(filePath: string, projectSlug?: string) {
  return projectSlug ? filePath.replaceAll('{projectSlug}', projectSlug) : filePath;
}

export async function resolveKnowledgeDocumentPath(document: KnowledgeDocument) {
  if (document.packageType === 'multi-chapter' && document.packagePath) {
    try {
      const metadata = JSON.parse(
        await fs.readFile(path.join(rootDir, document.packagePath, 'metadata.json'), 'utf8'),
      ) as { exportPath?: string };
      return metadata.exportPath ?? null;
    } catch {
      return null;
    }
  }
  return document.filePath ?? null;
}
