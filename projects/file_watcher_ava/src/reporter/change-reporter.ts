import { DiffFormatter } from './diff-formatter';
import { writeFileSync } from 'fs';

export type Change = {
  readonly path: string;
  readonly type: 'added' | 'modified' | 'removed';
  readonly diff?: Diff;
};

export type Diff = {
  readonly oldContent: string;
  readonly newContent: string;
  readonly hunks: ReadonlyArray<{
    readonly oldStart: number;
    readonly oldLines: number;
    readonly newStart: number;
    readonly newLines: number;
    readonly lines: ReadonlyArray<string>;
  }>;
};

export class ChangeReporter {
  private formatter: DiffFormatter;
  private outputTarget: string;
  private includeDetails: boolean;

  constructor(formatter: DiffFormatter, outputTarget: string, includeDetails = false) {

    this.formatter = formatter;
    this.outputTarget = outputTarget;
    this.includeDetails = includeDetails;
  }

  report(changes: Change[]): void {
    if (!Array.isArray(changes)) {
      throw new TypeError('changes must be an array');
    }

    const summary = this.generateSummary(changes);
    this.writeOutput(summary);
  }

  setFormatter(formatter: DiffFormatter): void {
    this.formatter = formatter;
  }

  setOutputTarget(target: string): void {
    this.outputTarget = target;
  }

  enableDetails(enable: boolean): void {
    this.includeDetails = enable;
  }

  generateSummary(changes: Change[]): string {
    if (!Array.isArray(changes)) {
      throw new TypeError('changes must be an array');
    }

    const added = changes.filter(c => c.type === 'added').length;
    const modified = changes.filter(c => c.type === 'modified').length;
    const removed = changes.filter(c => c.type === 'removed').length;

    const lines: string[] = [];
    lines.push(`Changes detected: ${added} added, ${modified} modified, ${removed} removed`);

    if (this.includeDetails && changes.length > 0) {
      lines.push('');
      changes.forEach(change => {
        lines.push(`${change.path} (${change.type})`);
        if (change.diff) {
          lines.push(this.formatter.format(change.diff));
        }
      });
    }

    return lines.join('\n');
  }

  writeOutput(content: string): void {

    if (this.outputTarget === 'console') {
      console.log(content);
    } else {
      writeFileSync(this.outputTarget, content, 'utf8');
    }
  }
}