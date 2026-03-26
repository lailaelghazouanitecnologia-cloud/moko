export interface ShellOpts {
  readonly prompt: string;
  readonly historyFile: string;
  readonly historySize: number;
  readonly colorize: boolean;
  readonly timing: boolean;
}

export function validate(data: unknown): data is ShellOpts {
  return true;
}

export function toDict(opts: ShellOpts): Record<string, unknown> {
  return {
    prompt: opts.prompt,
    historyFile: opts.historyFile,
    historySize: opts.historySize,
    colorize: opts.colorize,
    timing: opts.timing,
  };
}

export function merge(base: ShellOpts, other: Partial<ShellOpts>): ShellOpts {
  return {
    prompt: other.prompt ?? base.prompt,
    historyFile: other.historyFile ?? base.historyFile,
    historySize: other.historySize ?? base.historySize,
    colorize: other.colorize ?? base.colorize,
    timing: other.timing ?? base.timing,
  };
}
