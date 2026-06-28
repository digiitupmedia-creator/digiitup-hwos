import { promises as fs } from 'fs';
import path from 'path';
import {
  AgentDefinition,
  loadAgentRegistry,
  loadKnowledgeRegistry,
  loadResearchWorkflow,
  resolveKnowledgeDocumentPath,
  resolveProjectPath,
} from '@/lib/registry';

const rootDir = process.cwd();

export type AgentOperationalStatus = 'Ready' | 'Blocked' | 'Not Configured';

async function fileExists(relativePath: string) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

function missingRegistryFields(agent: AgentDefinition) {
  const value = agent as unknown as Record<string, unknown>;
  const stringFields = ['id', 'name', 'department', 'role', 'status'];
  const arrayFields = [
    'inputDeliverables',
    'outputDeliverables',
    'requiredKnowledge',
    'requiredArchitectures',
    'requiredDocuments',
  ];
  const missing = stringFields.filter((field) => typeof value[field] !== 'string' || value[field] === '');
  missing.push(...arrayFields.filter((field) => !Array.isArray(value[field])));
  if (typeof value.executionOrder !== 'number') missing.push('executionOrder');
  if (!Object.prototype.hasOwnProperty.call(value, 'downstreamAgent')) missing.push('downstreamAgent');
  if (!Object.prototype.hasOwnProperty.call(value, 'instructionFile')) missing.push('instructionFile');
  return missing;
}

export async function inspectAgent(agentId: string) {
  const [agentRegistry, knowledgeRegistry, workflow] = await Promise.all([
    loadAgentRegistry(),
    loadKnowledgeRegistry(),
    loadResearchWorkflow(),
  ]);
  const agent = agentRegistry.agents.find((item) => item.id === agentId);
  if (!agent) return null;

  const warnings: string[] = [];
  const missingFields = missingRegistryFields(agent);
  const documents = new Map(knowledgeRegistry.documents.map((document) => [document.id, document]));
  const agents = new Set(agentRegistry.agents.map((item) => item.id));
  const stages = new Map(workflow.stages.map((stage) => [stage.stageId, stage]));
  const workflowStage = workflow.stages.find((stage) => stage.agent === agent.id) ?? null;

  const requiredKnowledge = await Promise.all((agent.requiredKnowledge ?? []).map(async (id) => {
    const document = documents.get(id);
    const filePath = document ? await resolveKnowledgeDocumentPath(document) : null;
    const exists = filePath ? await fileExists(filePath) : false;
    if (!document) warnings.push(`Required knowledge ${id} is not registered.`);
    else if (!exists) warnings.push(`Required knowledge file is missing: ${filePath ?? document.packagePath ?? document.filePath ?? 'no path configured'}`);
    return { id, title: document?.title ?? 'Unknown document', filePath, exists };
  }));

  const requiredArchitectures = await Promise.all((agent.requiredArchitectures ?? []).map(async (id) => {
    const document = documents.get(id);
    const filePath = document ? await resolveKnowledgeDocumentPath(document) : null;
    const exists = filePath ? await fileExists(filePath) : false;
    if (!document) warnings.push(`Required architecture ${id} is not registered.`);
    else if (!exists) warnings.push(`Required architecture file is missing: ${filePath ?? document.packagePath ?? document.filePath ?? 'no path configured'}`);
    return { id, title: document?.title ?? 'Unknown document', filePath, exists };
  }));

  const requiredDocuments = await Promise.all((agent.requiredDocuments ?? []).map(async (reference) => {
    const document = documents.get(reference);
    const filePath = document ? await resolveKnowledgeDocumentPath(document) : resolveProjectPath(reference, '.template');
    if (!filePath) {
      warnings.push(`Required document ${reference} has no resolvable file path.`);
      return { id: reference, title: document?.title ?? 'Project document', filePath: 'Unresolved', exists: false };
    }
    const exists = await fileExists(filePath);
    if (!document && !reference.includes('{projectSlug}')) warnings.push(`Required document ${reference} is not registered.`);
    else if (!exists) warnings.push(`Required document is missing: ${filePath}`);
    return { id: reference, title: document?.title ?? 'Project document', filePath, exists };
  }));

  const describeDeliverable = (id: string) => {
    const stage = stages.get(id);
    if (!stage) warnings.push(`Deliverable ${id} has no workflow stage.`);
    return { id, filePath: stage?.outputPath ?? null, exists: Boolean(stage) };
  };
  const inputDeliverables = (agent.inputDeliverables ?? []).map(describeDeliverable);
  const outputDeliverables = (agent.outputDeliverables ?? []).map(describeDeliverable);

  if (!workflowStage) warnings.push(`No workflow stage is connected to agent ${agent.id}.`);
  if (agent.downstreamAgent && !agents.has(agent.downstreamAgent)) {
    warnings.push(`Downstream agent ${agent.downstreamAgent} is not registered.`);
  }
  const instructionFileExists = agent.instructionFile ? await fileExists(agent.instructionFile) : false;
  if (agent.instructionFile && !instructionFileExists) {
    warnings.push(`Raw instruction file is missing: ${agent.instructionFile}`);
  }

  const operationalStatus: AgentOperationalStatus = missingFields.length > 0
    ? 'Not Configured'
    : warnings.length > 0
      ? 'Blocked'
      : 'Ready';

  return {
    agent,
    operationalStatus,
    missingFields,
    warnings,
    requiredKnowledge,
    requiredArchitectures,
    requiredDocuments,
    inputDeliverables,
    outputDeliverables,
    workflowStage,
    validationRequirements: workflowStage?.validationGate ?? null,
    instructionFileExists,
  };
}

export type AgentInspection = NonNullable<Awaited<ReturnType<typeof inspectAgent>>>;
