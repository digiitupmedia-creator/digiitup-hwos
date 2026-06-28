export type KnowledgeValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type KnowledgeChapter = {
  chapterId: string;
  chapterNumber: string;
  title: string;
  partId: string;
  partTitle: string;
  status: string;
  filePath: string;
  wordCount: number;
  headingCount: number;
  content: string;
};

export type KnowledgePart = {
  partId: string;
  partNumber: string;
  title: string;
  detected: boolean;
  chapterIds: string[];
};

export type KnowledgeParserDiagnostics = {
  rawPartsDetected: number;
  rawChapterMarkersDetected: number;
  canonicalPartsProduced: number;
  canonicalChaptersProduced: number;
  mergedContinuationCount: number;
  duplicateChapterMarkersHandled: number;
  continuationMarkersDetected: number;
};

export type KnowledgePackage = {
  documentId: string;
  title: string;
  slug: string;
  version: string;
  status: string;
  sourceFileName: string;
  importedAt: string;
  totalParts: number;
  totalChapters: number;
  totalWordCount: number;
  expectedParts?: number;
  expectedChapters?: number;
  filePath: string;
  exportPath: string;
  snapshotPath: string;
  parts: KnowledgePart[];
  chapters: Omit<KnowledgeChapter, 'content'>[];
  parserDiagnostics?: KnowledgeParserDiagnostics;
  validation: KnowledgeValidationResult;
};

export type KnowledgeImportInput = {
  documentId: string;
  title: string;
  slug: string;
  version: string;
  status: string;
  sourceFileName: string;
  rawMarkdown: string;
  expectedParts?: number;
  expectedChapters?: number;
};

export type KnowledgeImportResult = {
  success: boolean;
  package?: KnowledgePackage;
  validation: KnowledgeValidationResult;
  error?: string;
};

export type ParsedKnowledgeDocument = {
  parts: KnowledgePart[];
  chapters: KnowledgeChapter[];
  diagnostics: KnowledgeParserDiagnostics;
};
