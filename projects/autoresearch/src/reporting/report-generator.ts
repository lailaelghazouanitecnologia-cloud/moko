interface Source {
  id: string;
  title: string;
  authors: string[];
  year: number;
  publisher: string;
  url?: string;
  type: 'book' | 'article' | 'webpage';
}

interface Citation {
  id: string;
  source: Source;
  formatted: string;
}

interface ReportSection {
  title: string;
  content: string;
  citations: Citation[];
}

interface ReportOptions {
  includeGraph: boolean;
  includeEvaluations: boolean;
  includeEvidence: boolean;
  format: 'html' | 'markdown' | 'pdf';
}

export class ReportGenerator {
  private knowledgeGraph: KnowledgeGraph;
  private researchPlanner: ResearchPlanner;
  private citationFormatter: CitationFormatter;
  private templateEngine: TemplateEngine;
  private evidenceRanker: EvidenceRanker;

  constructor(
    knowledgeGraph: KnowledgeGraph,
    researchPlanner: ResearchPlanner,
    citationFormatter?: CitationFormatter,
    templateEngine?: TemplateEngine,
    evidenceRanker?: EvidenceRanker
  ) {
    this.knowledgeGraph = knowledgeGraph;
    this.researchPlanner = researchPlanner;
    this.citationFormatter = citationFormatter || new CitationFormatter();
    this.templateEngine = templateEngine || new TemplateEngine(this.citationFormatter);
    this.evidenceRanker = evidenceRanker || new EvidenceRanker();
  }

  generateReport(options: ReportOptions = {
    includeGraph: true,
    includeEvaluations: true,
    includeEvidence: true,
    format: 'html'
  }): string {
    const sections: ReportSection[] = [];
    
    if (options.includeGraph) {
      sections.push(this.generateGraphSection());
    }
    
    if (options.includeEvaluations) {
      sections.push(this.generateEvaluationsSection());
    }
    
    if (options.includeEvidence) {
      sections.push(this.generateEvidenceSection());
    }
    
    const reportData = {
      title: 'Research Report',
      sections: sections,
      timestamp: new Date().toISOString(),
      summary: this.generateSummary()
    };
    
    const templateName = `report-${options.format}`;
    this.registerTemplateIfNotExists(templateName, this.getDefaultTemplate(options.format));
    
    return this.templateEngine.render(templateName, reportData);
  }

  generateSection(type: string, data: Record<string, unknown>): string {
    switch (type) {
      case 'graph':
        return this.generateGraphVisualization();
      case 'evaluations':
        return this.generateEvaluationsSummary();
      case 'evidence':
        return this.generateEvidenceSummary();
      case 'hypotheses':
        return this.generateHypothesesSummary();
      default:
        return '';
    }
  }

  addCitation(source: Source): Citation {
    const formatted = this.citationFormatter.format(source);
    const citation: Citation = {
      id: `cite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: source,
      formatted: formatted
    };
    return citation;
  }

  formatCitations(sources: Source[]): string {
    return this.citationFormatter.toBibliography(sources);
  }

  registerTemplate(name: string, content: string): void {
    this.templateEngine.registerTemplate(name, content);
  }

  getTemplate(name: string): string | undefined {
    return this.templateEngine['templateCache'].get(name);
  }

  listTemplates(): string[] {
    return Array.from(this.templateEngine['templateCache'].keys());
  }

  private generateGraphSection(): ReportSection {
    const nodes = Array.from(this.knowledgeGraph['nodes'].values());
    const edges = Array.from(this.knowledgeGraph['edges'].values());
    
    const content = this.generateGraphVisualization();
    const citations: Citation[] = [];
    
    return {
      title: 'Knowledge Graph',
      content: content,
      citations: citations
    };
  }

  private generateEvaluationsSection(): ReportSection {
    const evaluations = this.researchPlanner['hypotheses'].flatMap((evaluator: HypothesisEvaluator) => 
      evaluator['evaluationHistory'] || []
    );
    
    const content = this.generateEvaluationsSummary();
    const citations: Citation[] = [];
    
    return {
      title: 'Hypothesis Evaluations',
      content: content,
      citations: citations
    };
  }

  private generateEvidenceSection(): ReportSection {
    const evidence = this.evidenceRanker['evidencePool'] || [];
    const ranked = this.evidenceRanker.rankAll();
    
    const content = this.generateEvidenceSummary();
    const citations: Citation[] = [];
    
    return {
      title: 'Evidence Analysis',
      content: content,
      citations: citations
    };
  }

  private generateGraphVisualization(): string {
    const nodes = Array.from(this.knowledgeGraph['nodes'].values());
    const edges = Array.from(this.knowledgeGraph['edges'].values());
    
    let viz = 'Graph Structure:\n\n';
    viz += `Nodes (${nodes.length}):\n`;
    nodes.forEach(node => {
      viz += `  - ${node.getLabel()} (${node.getId()})\n`;
    });
    
    viz += `\nEdges (${edges.length}):\n`;
    edges.forEach(edge => {
      viz += `  - ${edge.getSourceId()} -> ${edge.getTargetId()}: ${edge.getLabel()}\n`;
    });
    
    return viz;
  }

  private generateEvaluationsSummary(): string {
    const evaluators = this.researchPlanner['hypotheses'] || [];
    
    let summary = 'Evaluation Summary:\n\n';
    evaluators.forEach((evaluator: HypothesisEvaluator, index: number) => {
      const history = evaluator['evaluationHistory'] || [];
      const latest = history[history.length - 1];
      
      summary += `Hypothesis ${index + 1}:\n`;
      summary += `  - Evaluations: ${history.length}\n`;
      if (latest) {
        summary += `  - Latest Score: ${latest.score}\n`;
        summary += `  - Confidence: ${latest.evaluation.confidence}\n`;
      }
      summary += '\n';
    });
    
    return summary;
  }

  private generateEvidenceSummary(): string {
    const ranked = this.evidenceRanker.rankAll();
    
    let summary = 'Evidence Summary:\n\n';
    summary += `Total Evidence: ${ranked.length}\n\n`;
    
    summary += 'Top 10 Evidence Items:\n';
    ranked.slice(0, 10).forEach((item, index) => {
      summary += `  ${index + 1}. Score: ${item.score.toFixed(2)} - ${item.item.hypothesisId}\n`;
    });
    
    return summary;
  }

  private generateHypothesesSummary(): string {
    const evaluators = this.researchPlanner['hypotheses'] || [];
    
    let summary = 'Hypotheses Summary:\n\n';
    summary += `Total Hypotheses: ${evaluators.length}\n\n`;
    
    evaluators.forEach((evaluator: HypothesisEvaluator, index: number) => {
      summary += `Hypothesis ${index + 1}:\n`;
      summary += `  - Evidence Threshold: ${evaluator['evidenceThreshold']}\n`;
      summary += `  - Scoring Weights: ${JSON.stringify(evaluator['scoringWeights'])}\n\n`;
    });
    
    return summary;
  }

  private generateSummary(): string {
    const nodeCount = this.knowledgeGraph['nodes'].size;
    const edgeCount = this.knowledgeGraph['edges'].size;
    const hypothesisCount = this.researchPlanner['hypotheses']?.length || 0;
    const evidenceCount = this.evidenceRanker['evidencePool']?.length || 0;
    
    return `This report analyzes ${nodeCount} knowledge nodes connected by ${edgeCount} relationships, evaluating ${hypothesisCount} hypotheses against ${evidenceCount} evidence items.`;
  }

  private registerTemplateIfNotExists(name: string, content: string): void {
    if (!this.templateEngine['templateCache'].has(name)) {
      this.templateEngine.registerTemplate(name, content);
    }
  }

  private getDefaultTemplate(format: string): string {
    switch (format) {
      case 'html':
        return `<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .section { margin: 20px 0; }
    .citation { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <p><em>Generated: {{timestamp}}</em></p>
  <p>{{summary}}</p>
  {{#each sections}}
  <div class="section">
    <h2>{{title}}</h2>
    <div>{{{content}}}</div>
    {{#each citations}}
    <div class="c="citation">{{formatted}}</div>
    {{/each}}
  </div>
  {{/each}}
</body>
</html>`;
      
      case 'markdown':
        return `# {{title}}

Generated: {{timestamp}}

{{summary}}

{{#each sections}}
## {{title}}

{{{content}}}
{{#each citations}}
- {{formatted}}
{{/each}}

{{/each}}`;
      
      default:
        return `{{title}}
===========

Generated: {{timestamp}}

{{summary}}

{{#each sections}}
{{title}}
-----------
{{{content}}}
{{#each citations}}
- {{formatted}}
{{/each}}

{{/each}}`;
    }
  }
}
