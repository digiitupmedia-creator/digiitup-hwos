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

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

async function exists(relativePath: string) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function validateRegistries(): Promise<ValidationResult> {
  const [knowledge, agents, workflow] = await Promise.all([
    loadKnowledgeRegistry(),
    loadAgentRegistry(),
    loadResearchWorkflow(),
  ]);
  const errors: string[] = [];
  const documents = new Map(knowledge.documents.map((document) => [document.id, document]));
  const agentIds = new Set(agents.agents.map((agent) => agent.id));
  const stages = new Map(workflow.stages.map((stage) => [stage.stageId, stage]));

  if (documents.size !== knowledge.documents.length) errors.push('Knowledge registry contains duplicate document IDs.');
  if (agentIds.size !== agents.agents.length) errors.push('Agent registry contains duplicate agent IDs.');
  if (stages.size !== workflow.stages.length) errors.push('Workflow registry contains duplicate stage IDs.');

  for (const document of knowledge.documents) {
    const documentPath = await resolveKnowledgeDocumentPath(document);
    if (!documentPath || !await exists(documentPath)) errors.push(`Knowledge document ${document.id} is missing: ${documentPath ?? document.packagePath ?? document.filePath ?? 'no path configured'}`);
    for (const dependency of document.dependencies) {
      if (!documents.has(dependency)) errors.push(`Knowledge document ${document.id} references unknown dependency ${dependency}.`);
    }
  }
  for (const agent of agents.agents) {
    for (const id of [...agent.requiredKnowledge, ...agent.requiredArchitectures]) {
      if (!documents.has(id)) errors.push(`Agent ${agent.id} references unknown knowledge dependency ${id}.`);
    }
    for (const item of agent.requiredDocuments.filter((value) => !value.includes('{projectSlug}'))) {
      if (!documents.has(item)) errors.push(`Agent ${agent.id} references unknown required document ${item}.`);
    }
    for (const id of [...agent.inputDeliverables, ...agent.outputDeliverables]) {
      if (!stages.has(id)) errors.push(`Agent ${agent.id} references unknown deliverable ${id}.`);
    }
    if (agent.downstreamAgent && !agentIds.has(agent.downstreamAgent)) {
      errors.push(`Agent ${agent.id} references unknown downstream agent ${agent.downstreamAgent}.`);
    }
  }
  for (const stage of workflow.stages) {
    if (!agentIds.has(stage.agent)) errors.push(`Workflow stage ${stage.stageId} references unknown agent ${stage.agent}.`);
    const stageAgent = agents.agents.find((agent) => agent.id === stage.agent);
    if (stageAgent && !stageAgent.outputDeliverables.includes(stage.stageId)) {
      errors.push(`Workflow stage ${stage.stageId} is not declared as an output of agent ${stage.agent}.`);
    }
    for (const output of stage.expectedOutputs) {
      if (!stages.has(output)) errors.push(`Workflow stage ${stage.stageId} references unknown expected output ${output}.`);
    }
    for (const input of stage.requiredInputs.filter((item) => item.startsWith('RD-'))) {
      if (!stages.has(input)) errors.push(`Workflow stage ${stage.stageId} references unknown required deliverable ${input}.`);
    }
    const templatePath = resolveProjectPath(stage.outputPath, '.template');
    if (!await exists(templatePath)) errors.push(`Workflow stage ${stage.stageId} output template is missing: ${templatePath}`);
    if (stage.nextStage && !stages.has(stage.nextStage)) errors.push(`Workflow stage ${stage.stageId} references unknown next stage ${stage.nextStage}.`);
    if (!stages.has(stage.failureRoute)) errors.push(`Workflow stage ${stage.stageId} references unknown failure route ${stage.failureRoute}.`);
  }
  return { valid: errors.length === 0, errors };
}

export async function validateAgentContext(agent: AgentDefinition, projectSlug?: string): Promise<ValidationResult> {
  const [base, knowledge, workflow] = await Promise.all([
    validateRegistries(),
    loadKnowledgeRegistry(),
    loadResearchWorkflow(),
  ]);
  const errors = [...base.errors];
  const documents = new Map(knowledge.documents.map((document) => [document.id, document]));
  for (const id of [...agent.requiredKnowledge, ...agent.requiredArchitectures]) {
    const document = documents.get(id);
    const documentPath = document ? await resolveKnowledgeDocumentPath(document) : null;
    if (document && (!documentPath || !await exists(documentPath))) errors.push(`Required knowledge ${id} is missing: ${documentPath ?? document.packagePath ?? document.filePath ?? 'no path configured'}`);
  }
  if (!projectSlug && (agent.inputDeliverables.length > 0 || agent.requiredDocuments.some((value) => value.includes('{projectSlug}')))) {
    errors.push(`Agent ${agent.id} requires a project before project files, deliverables, and snapshots can be resolved.`);
  }
  if (projectSlug) {
    for (const item of agent.requiredDocuments.filter((value) => value.includes('{projectSlug}'))) {
      const filePath = resolveProjectPath(item, projectSlug);
      if (!await exists(filePath)) errors.push(`Required project file is missing: ${filePath}`);
    }
    for (const deliverableId of agent.inputDeliverables) {
      const stage = workflow.stages.find((item) => item.stageId === deliverableId);
      if (!stage) continue;
      const deliverablePath = resolveProjectPath(stage.outputPath, projectSlug);
      if (!await exists(deliverablePath)) errors.push(`Required deliverable ${deliverableId} is missing: ${deliverablePath}`);
      const snapshotPath = `projects/${projectSlug}/knowledge-snapshots/${deliverableId}.json`;
      if (!await exists(snapshotPath)) errors.push(`Required immutable snapshot ${deliverableId} is missing: ${snapshotPath}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
