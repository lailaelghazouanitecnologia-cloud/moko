import { Token } from './token';

export class Tokenizer {
  private readonly input: string;
  private position: number = 0;
  private readonly tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): ReadonlyArray<Token> {
    this.position = 0;
    this.tokens.length = 0;

    while (this.position < this.input.length) {
      this.skipWhitespace();
      if (this.position >= this.input.length) break;

      const char = this.input[this.position];

      if (this.isDigit(char)) {
        this.tokenizeNumber();
      } else if (this.isOperator(char)) {
        this.tokenizeOperator();
      } else if (this.isParenthesis(char)) {
        this.tokenizeParenthesis();
      } else {
        throw new Error(`Unexpected character: ${char}`);
      }
    }

    return [...this.tokens];
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

   private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  private isParenthesis(char: string): boolean {
    return '()'.includes(char);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  private isParenthesis(char: string): boolean {
    return '()'.includes(char);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  private isParenthesis(char: string): boolean {
    return '()'.includes(char);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  private isParenthesis(char: string): boolean {
       return '()'.includes(char);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  private isParenthesis(char: string): boolean {
    return '()'.includes(char);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  private isParenthesis(char: string): boolean {
    return '()'.includes(char);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  private isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  isParent(char: string): boolean {
    return '()'.includes(char);
  }

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  isOperator(char: string): boolean:
    return '+-*/'.includes(char);
  }

  isParenthesis(char: string): boolean {
    return '()'. includes(char);
  }

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
  }

  isParent(char: string): boolean {
    return '()'.includes(char);
  }

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this.isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: string): boolean {
    return '()'.includes(char);
 

  isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: char: string): boolean {
    return '()'.includes(char);
 0

  isWhitespace(char: string): boolean:
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: char: string): boolean {
    return '()'.includes(char);
 0

  isWhitespace(char: string): boolean:
    return /\s/.test(char);
  }

  isNumber(char: string): boolean {
    return this isDigit(char) || char === '.';
  }

  is
  isOperator(char: string): boolean {
    return '+-*/'.includes(char);
 

  isParent(char: char: string): boolean {
    return '()'.includes(char);
 0

  isWhitespace(char: string): boolean:
    return /\s<
