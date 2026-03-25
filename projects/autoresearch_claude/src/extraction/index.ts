/**
 * Extraction module for the autonomous research agent.
 * Provides content parsing, paper extraction, and citation resolution.
 */

export {
  ContentParser,
  type Citation,
  type ParsedContent,
  type Section,
  type KeyTerm,
} from "./content-parser";

export {
  PaperExtractor,
  type Paper,
  type PaperMetadata,
  type Reference,
} from "./paper-extractor";

export {
  CitationResolver,
  type ResolvedCitation,
  type CitationEdge,
  type CitationGraph,
  type CitationStyle,
} from "./citation-resolver";
