import { ParsedResult, ValidationRule } from './types';

export class DataParser extends Event {
  public format: string;
  public schema: object;
  public validationRules: ValidationRule[];

  constructor(format: string, schema: object = {}, validationRules: ValidationRule[] = []) {
    super();
    this.format = format;
    this.schema = schema;
    this.validationRules = validationRules;
  }

  public parseJSON(data: string): ParsedResult {
    try {
      const parsedData = JSON.parse(data);
      return {
        data: parsedData,
        format: 'json',
        metadata: {
          timestamp: new Date(),
          size: data.length,
          format: 'json'
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public parseCSV(data: string): ParsedResult {
    const lines = data.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('Empty CSV data');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return {
      data: { headers, rows },
      format: 'csv',
      metadata: {
        timestamp: new Date(),
        size: data.length,
        rowCount: rows.length,
        format: 'csv'
      }
    };
  }

  public parseXML(data: string): ParsedResult {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, 'text/xml');
    
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }

    const xmlToJson = (node: Element): any => {
      const obj: any = {};
      
      if (node.attributes.length > 0) {
        obj['@attributes'] = {};
        for (const attr of node.attributes) {
          obj['@attributes'][attr.name] = attr.value;
        }
      }

      for (const child of node.children) {
        const childName = child.tagName;
        if (!obj[childName]) {
          obj[childName] = [];
        }
        obj[childName].push(xmlToJson(child));
      }

      if (node.textContent && node.textContent.trim() && node.children.length === 0) {
        obj['#text'] = node.textContent.trim();
      }

      return obj;
    };

    const rootElement = xmlDoc.documentElement;
    const jsonData = xmlToJson(rootElement);

    return {
      data: jsonData,
      format: 'xml',
      metadata: {
        timestamp: new Date(),
        size: data.length,
        rootElement: rootElement.tagName,
        format: 'xml'
      }
    };
  }

  public parseLog(data: string): ParsedResult {
    const lines = data.split('\n').filter(line => line.trim().length > 0);
    const entries: any[] = [];
    
    const timestampRegex = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
    const levelRegex = /\b(INFO|WARN|ERROR|DEBUG|TRACE)\b/;
    
    for (const line of lines) {
      const entry: any = {
        raw: line,
        timestamp: null,
        level: null,
        message: line
      };

      const timestampMatch = line.match(timestampRegex);
      if (timestampMatch) {
        entry.timestamp = new Date(timestampMatch[0]);
      }

      const levelMatch = line.match(levelRegex);
      if (levelMatch) {
        entry.level = levelMatch[1];
      }

      entries.push(entry);
    }

    return {
      data: entries,
      format: 'log',
      metadata: {
        timestamp: new Date(),
        size: data.length,
        lineCount: lines.length,
        format: 'log'
      }
    };
  }

  public extractPredictions(data: ParsedResult): number[] {
    if (!data.data) {
      return [];
    }

    const extractNumbers = (obj: any): number[] => {
      if (Array.isArray(obj)) {
        return obj.filter(item => typeof item === 'number');
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const numbers: number[] = [];
        for (const key in obj) {
          if (key.toLowerCase().includes('prediction') || key.toLowerCase().includes('pred')) {
            if (typeof obj[key] === 'number') {
              numbers.push(obj[key]);
            } else if (Array.isArray(obj[key])) {
              numbers.push(...obj[key].filter((item: any) => typeof item === 'number'));
            }
          }
        }
        return numbers;
      }
      
      return [];
    };

    return extractNumbers(data.data);
  }

  public extractLabels(data: ParsedResult): number[] {
    if (!data.data) {
      return [];
    }

    const extractNumbers = (obj: any): number[] => {
      if (Array.isArray(obj)) {
        return obj.filter(item => typeof item === 'number');
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const numbers: number[] = [];
        for (const key in obj) {
          if (key.toLowerCase().includes('label') || key.toLowerCase().includes('target') || key.toLowerCase().includes('actual')) {
            if (typeof obj[key] === 'number') {
              numbers.push(obj[key]);
            } else if (Array.isArray(obj[key])) {
              numbers.push(...obj[key].filter((item: any) => typeof item === 'number'));
            }
          }
        }
        return numbers;
      }
      
      return [];
    };

    return extractNumbers(data.data);
  }

  public extractScores(data: ParsedResult): number[] {
    if (!data.data) {
      return [];
    }

    const extractNumbers = (obj: any): number[] => {
      if (Array.isArray(obj)) {
        return obj.filter(item => typeof item === 'number');
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const numbers: number[] = [];
        for (const key in obj) {
          if (key.toLowerCase().includes('score') || key.toLowerCase().includes('probability') || key.toLowerCase().includes('confidence')) {
            if (typeof obj[key] === 'number') {
              numbers.push(obj[key]);
            } else if (Array.isArray(obj[key])) {
              numbers.push(...obj[key].filter((item: any) => typeof item === 'number'));
            }
          }
        }
        return numbers;
      }
      
      return [];
    };

    return extractNumbers(data.data);
  }

  public validateFormat(data: string): boolean {
    try {
      switch (this.format.toLowerCase()) {
        case 'json':
          JSON.parse(data);
          return true;
        case 'csv':
          const lines = data.trim().split('\n');
          return lines.length > 0 && lines[0].includes(',');
        case 'xml':
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(data, 'text/xml');
          return !xmlDoc.querySelector('parsererror');
        case 'log':
          return data.length > 0;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  public convertFormat(data: string, targetFormat: string): string {
    const parsed = this.parse(data);
    
    switch (targetFormat.toLowerCase()) {
      case 'json':
        return JSON.stringify(parsed.data, null, 2);
      case 'csv':
        if (Array.isArray(parsed.data)) {
          if (parsed.data.length === 0) return '';
          const headers = Object.keys(parsed.data[0]);
          const csvRows = [headers.join(',')];
          for (const row of parsed.data) {
            csvRows.push(headers.map(h => row[h] || '').join(','));
          }
          return csvRows.join('\n');
        }
        return '';
      case 'xml':
        const jsonToXml = (obj: any, rootName: string = 'root'): string => {
          let xml = '';
          if (Array.isArray(obj)) {
            xml += `<${rootName}>`;
            for (const item of obj) {
              xml += jsonToXml(item, 'item');
            }
            xml += `</${rootName}>`;
          } else if (typeof obj === 'object' && obj !== null) {
            xml += `<${rootName}>`;
            for (const key in obj) {
              xml += jsonToXml(obj[key], key);
            }
            xml += `</${rootName}>`;
          } else {
            xml += `<${rootName}>${obj}</${rootName}>`;
          }
          return xml;
        };
        return jsonToXml(parsed.data);
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`);
    }
  }

  public mergeResults(results: ParsedResult[]): ParsedResult {
    if (results.length === 0) {
      throw new Error('Cannot merge empty results array');
    }

    const mergedData: any[] = [];
    const formats = new Set<string>();
    
    for (const result of results) {
      if (result.data) {
        if (Array.isArray(result.data)) {
          mergedData.push(...result.data);
        } else {
          mergedData.push(result.data);
        }
      }
      formats.add(result.format);
    }

    return {
      data: mergedData,
      format: formats.size === 1 ? Array.from(formats)[0] : 'mixed',
      metadata: {
        timestamp: new Date(),
        sourceCount: results.length,
        totalSize: results.reduce((sum, r) => sum + (r.metadata?.size || 0), 0),
        formats: Array.from(formats)
      }
    };
  }

  public parse(data: string): ParsedResult {
    switch (this.format.toLowerCase()) {
      case 'json':
        return this.parseJSON(data);
      case 'csv':
        return this.parseCSV(data);
      case 'xml':
        return this.parseXML(data);
      case 'log':
        return this.parseLog(data);
      default:
        throw new Error(`Unsupported format: ${this.format}`);
    }
  }

  public static detectFormat(data: string): string {
    if (!data || data.trim().length === 0) {
      return 'empty';
    }

    const trimmed = data.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {}
    }

    if (trimmed.startsWith('<')) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(trimmed, 'text/xml');
      if (!xmlDoc.querySelector('parsererror')) {
        return 'xml';
      }
    }

    if (trimmed.includes(',') && trimmed.split('\n').length > 1) {
      return 'csv';
    }

    if (trimmed.includes('INFO') || trimmed.includes('ERROR') || trimmed.includes('WARN') || trimmed.includes('DEBUG')) {
      return 'log';
    }

    return 'text';
  }
}
