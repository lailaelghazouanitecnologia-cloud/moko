import { FunctionTool } from './function-tool';
import { ToolResult } from './tool-result';

export class FunctionCall {
    id: string;
    name: string;
    parameters: Record<string, any>;

    constructor(id: string, name: string, parameters: Record<string, any> = {}) {
        this.id = id;
        this.name = name;
        this.parameters = parameters;
    }

    validate(tool: FunctionTool): ValidationResult {
        const schema = tool.getParametersSchema();
        const errors: string[] = [];

        for (const [paramName, paramSchema] of Object.entries(schema)) {
            const value = this.parameters[paramName];
            
            if (paramSchema.required && (value === undefined || value === null)) {
                errors.push(`Missing required parameter: ${paramName}`);
                continue;
            }

            if (value !== undefined && value !== null) {
                if (paramSchema.type === 'number' && typeof value !== 'number') {
                    errors.push(`Parameter ${paramName} must be a number`);
                } else if (paramSchema.type === 'string' && typeof value !== 'string') {
                    errors.push(`Parameter ${paramName} must be a string`);
                } else if (paramSchema.type === 'boolean' && typeof value !== 'boolean') {
                    errors.push(`Parameter ${paramName} must be a boolean`);
                } else if (paramSchema.type === 'array' && !Array.isArray(value)) {
                    errors.push(`Parameter ${paramName} must be an array`);
                } else if (paramSchema.type === 'object' && typeof value !== 'object') {
                    errors.push(`Parameter ${paramName} must be an object`);
                }
            }
        }

        for (const paramName of Object.keys(this.parameters)) {
            if (!(paramName in schema)) {
                errors.push(`Unknown parameter: ${paramName}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    async execute(handler: Function): Promise<ToolResult> {
        try {
            const result = await handler(this.parameters);
            return {
                success: true,
                data: result,
                error: null
            };
        } catch (error) {
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    toString(): string {
        const paramStr = Object.entries(this.parameters)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join(', ');
        return `FunctionCall(${this.name}, ${paramStr})`;
    }

    getParameter(name: string): any {
        return this.parameters[name];
    }

    hasParameter(name: string): boolean {
        return name in this.parameters;
    }

    listParameters(): string[] {
        return Object.keys(this.parameters);
    }

    sanitize(): FunctionCall {
        const sanitized: Record<string, any> = {};
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
        
        for (const [key, value] of Object.entries(this.parameters)) {
            const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
            sanitized[key] = isSensitive ? '[REDACTED]' : value;
        }

        return new FunctionCall(this.id, this.name, sanitized);
    }
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
}
