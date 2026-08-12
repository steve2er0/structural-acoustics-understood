export interface ResultValue {
  label: string;
  value: number | string;
  unit?: string;
  tone?: string;
  note?: string;
}

export interface RelatedConcept {
  title: string;
  description: string;
  href: string;
}

export interface EngineeringResult {
  values: ResultValue[];
  interpretation: {
    summary: string;
    physicalMeaning: string;
    engineeringConsiderations: string[];
  };
  assumptions: {
    satisfied: string[];
    warnings: string[];
  };
  validity: {
    regime: string;
    confidence: string;
  };
  relatedConcepts: RelatedConcept[];
  plots?: unknown[];
  rangeCharts?: unknown[];
  heatmaps?: unknown[];
  tables?: unknown[];
  csv?: unknown;
}

export function buildEngineeringResult(options: {
  id: string;
  definition: Record<string, unknown>;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
}): EngineeringResult;

export function assertEngineeringResult(result: unknown, id?: string): asserts result is EngineeringResult;
export function createEngineeringCalculator(id: string, definition: Record<string, unknown>): Record<string, unknown>;
export function createEngineeringRegistry(definitions: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>>;
export function engineeringResultToText(title: string, result: EngineeringResult, formatValue?: (value: number | string) => string): string;
