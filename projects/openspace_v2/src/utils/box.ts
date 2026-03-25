import { Colors } from './colors';
import { BoxStyle } from './box-style';

const BOX_CHARS: Record<BoxStyle, Readonly<Record<string, string>>> = {
  [BoxStyle.ROUNDED]: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
    cross: '┼',
  },
  [BoxStyle.SINGLE]: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
    cross: '┼',
  },
  [BoxStyle.DOUBLE]: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    leftT: '╠',
    rightT: '╣',
    cross: '╬',
  },
  [BoxStyle.HEAVY]: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    leftT: '┣',
    rightT: '┫',
    cross: '╋',
  },
  [BoxStyle.LIGHT]: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    leftT: '├',
    rightT: '┤',
    cross: '┼',
  },
  [BoxStyle.MINIMAL]: {
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    horizontal: ' ',
    vertical: '│',
    leftT: '│',
    rightT: '│',
    cross: '│',
  },
};

export class Box {
  private readonly width: number;
  private readonly style: BoxStyle;
  private readonly color: string;
  private readonly padding: number;
  private readonly chars: Readonly<Record<string, string>>;

  constructor(
    width: number = 68,
    style: BoxStyle = BoxStyle.ROUNDED,
    color: string = 'bl',
    padding: number = 2,
  ) {
    if (!Number.isInteger(width) || width < 4) {
      throw new RangeError('width must be an integer >= 4');
    }
    if (!Number.isInteger(padding) || padding < 0) {
      throw new RangeError('padding must be a non-negative integer');
    }
    this.width = width;
    this.style = style;
    this.color = color;
    this.padding = padding;
    this.chars = BOX_CHARS[style] ?? BOX_CHARS[BoxStyle.ROUNDED];
  }

  top_line(indent: number = 2): string {
    if (!Number.isInteger(indent) || indent < 0) {
      throw new RangeError('indent must be a non-negative integer');
    }
    const indentStr = ' '.repeat(indent);
    const horizontal = this.chars.horizontal.repeat(this.width - 2);
    return `${indentStr}${this.chars.topLeft}${horizontal}${this.chars.topRight}`;
  }

  bottom_line(indent: number = 2): string {
    if (!Number.isInteger(indent) || indent < 0) {
      throw new RangeError('indent must be a non-negative integer');
    }
    const indentStr = ' '.repeat(indent);
    const horizontal = this.chars.horizontal.repeat(this.width - 2);
    return `${indentStr}${this.chars.bottomLeft}${horizontal}${this.chars.bottomRight}`;
  }

  separator_line(indent: number = 2): string {
    if (!Number.isInteger(indent) || indent < 0) {
      throw new RangeError('indent must be a non-negative integer');
    }
    const indentStr = ' '.repeat(indent);
    const horizontal = this.chars.horizontal.repeat(this.width - 2);
    return `${indentStr}${this.chars.leftT}${horizontal}${this.chars.rightT}`;
  }

  empty_line(indent: number = 2): string {
    if (!Number.isInteger(indent) || indent < 0) {
      throw new RangeError('indent must be a non-negative integer');
    }
    const indentStr = ' '.repeat(indent);
    const spaces = ' '.repeat(this.width - 2);
    return `${indentStr}${this.chars.vertical}${spaces}${this.chars.vertical}`;
  }

  text_line(
    text: string,
    align: 'left' | 'center' | 'right' = 'left',
    indent: number = 2,
    textColor: string = '',
  ): string {
    if (!['left', 'center', 'right'].includes(align)) {
      throw new TypeError("align must be 'left', 'center', or 'right'");
    }
    if (!Number.isInteger(indent) || indent < 0) {
      throw new RangeError('indent must be a non-negative integer');
    }
    const indentStr = ' '.repeat(indent);
    const availableWidth = this.width - 2 - this.padding * 2;
    const truncatedText = text.length > availableWidth ? text.slice(0, availableWidth - 3) + '...' : text;

    let paddedText: string;
    if (align === 'center') {
      const totalPadding = availableWidth - truncatedText.length;
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;
      paddedText = ' '.repeat(leftPadding) + truncatedText + ' '.repeat(rightPadding);
    } else if (align === 'right') {
      const leftPadding = availableWidth - truncatedText.length;
      paddedText = ' '.repeat(leftPadding) + truncatedText;
    } else {
      paddedText = truncatedText + ' '.repeat(availableWidth - truncatedText.length);
    }

    const colorPrefix = textColor ? this.getColorCode(textColor) : '';
    const colorSuffix = textColor ? Colors.RESET : '';

    return `${indentStr}${this.chars.vertical}${' '.repeat(this.padding)}${colorPrefix}${paddedText}${colorSuffix}${' '.repeat(this.padding)}${this.chars.vertical}`;
  }

  build(
    title?: string,
    lines: string[] = [],
    footer?: string,
    indent: number = 2,
  ): string {
    if (title !== undefined && typeof title !== 'string') {
      throw new TypeError('title must be a string or undefined');
    }
    if (!Array.isArray(lines)) {
      throw new TypeError('lines must be an array of strings');
    }
    if (footer !== undefined && typeof footer !== 'string') {
      throw new TypeError('footer must be a string or undefined');
    }
    if (!Number.isInteger(indent) || indent < 0) {
      throw new RangeError('indent must be a non-negative integer');
    }
    const result: string[] = [];

    result.push(this.top_line(indent));

    if (title) {
      result.push(this.empty_line(indent));
      result.push(this.text_line(title, 'center', indent, this.color));
      result.push(this.empty_line(indent));
      result.push(this.separator_line(indent));
    }

    for (const line of lines) {
      if (line === '') {
        result.push(this.empty_line(indent));
      } else {
        result.push(this.text_line(line, 'left', indent));
      }
    }

    if (footer) {
      if (lines.length > 0) {
        result.push(this.separator_line(indent));
      }
      result.push(this.empty_line(indent));
      result.push(this.text_line(footer, 'center', indent, this.color));
      result.push(this.empty_line(indent));
    }

    result.push(this.bottom_line(indent));

    return result.join('\n');
  }

  private getColorCode(color: string): string {
    const colorMap: Readonly<Record<string, string>> = {
      'bl': Colors.BLUE,
      'g': Colors.GREEN,
      'r': Colors.RED,
      'y': Colors.YELLOW,
      'm': Colors.MAGENTA,
      'c': Colors.CYAN,
      'w': Colors.WHITE,
      'gr': Colors.GRAY,
      'gs': Colors.GREEN_SOFT,
      'bs': Colors.BLUE_SOFT,
      'cs': Colors.CYAN_SOFT,
      'ys': Colors.YELLOW_SOFT,
      'rs': Colors.RED_SOFT,
      'ms': Colors.MAGENTA_SOFT,
      'grs': Colors.GRAY_SOFT,
    };
    return colorMap[color] ?? '';
  }
}
