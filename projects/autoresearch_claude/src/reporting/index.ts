/**
 * Reporting module - Autonomous research agent report generation.
 */

export { CitationFormatter } from "./citation-formatter.js";
export type { Paper, CitationStyle } from "./citation-formatter.js";

export { TemplateEngine } from "./template-engine.js";
export type { HelperFn, CompiledTemplate } from "./template-engine.js";

export { ReportGenerator } from "./report-generator.js";
export type { Finding, ReportSection } from "./report-generator.js";
