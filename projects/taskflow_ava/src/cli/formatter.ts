type ColorName = string & { readonly __brand: 'ColorName' };
type ColorCode = string & { readonly __brand: 'ColorCode' };

type FormatterSymbol = {
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
  readonly arrow: string;
  readonly check: string;
  readonly start: string;
  readonly stop: string;
  readonly block: string;
  readonly line: string;
  readonly box: string;
};
