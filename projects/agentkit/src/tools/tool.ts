import { FunctionTool } from './function-tool';

export class Tool {
    type: string;
    function: FunctionTool;
    human_input: boolean;

    constructor(type: string, func: FunctionTool, humanInput: boolean = false) {
        this.type = type;
        this.function = func;
        this.human_input = humanInput;
    }

    isFunctionTool(): boolean {
        return this.type === 'function';
    }

    requiresHumanInput(): boolean {
        return this.human_input;
    }

    toJSON(): object {
        return {
            type: this.type,
            function: this.function.toJSON(),
            human_input: this.human_input
        };
    }

    static fromJSON(data: object): Tool {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid tool data');
        }

        const toolData = data as any;
        if (!toolData.type || typeof toolData.type !== 'string') {
            throw new Error('Tool type is required');
        }

        if (!toolData.function) {
            throw new Error('Tool function is required');
        }

        const func = FunctionTool.fromJSON(toolData.function);
        const humanInput = toolData.human_input === true;

        return new Tool(toolData.type, func, humanInput);
    }

    clone(): Tool {
        return new Tool(
            this.type,
            this.function.clone(),
            this.human_input
        );
    }

    update(updates: Partial<Tool>): Tool {
        return new Tool(
            updates.type !== undefined ? updates.type : this.type,
            updates.function !== undefined ? updates.function : this.function,
            updates.human_input !== undefined ? updates.human_input : this.human_input
        );
    }
}
