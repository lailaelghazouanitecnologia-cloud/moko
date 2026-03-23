import { v4 as uuidv4 } from 'uuid';
import { MessageRole } from './message-role';
import { ToolCall } from './tool-call';
import { ToolOutput } from './tool-output';
import { MessageJSON } from './message-json';

export class Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    metadata: Record<string, any>;
    toolCalls: ToolCall[];
    toolOutputs: ToolOutput[];

    constructor() {
        this.id = uuidv4();
        this.role = MessageRole.USER;
        this.content = '';
        this.timestamp = new Date();
        this.metadata = {};
        this.toolCalls = [];
        this.toolOutputs = [];
    }

    isUser(): boolean {
        return this.role === MessageRole.USER;
    }

    isAssistant(): boolean {
        return this.role === MessageRole.ASSISTANT;
    }

    isSystem(): boolean {
        return this.role === MessageRole.SYSTEM;
    }

    hasToolCalls(): boolean {
        return this.toolCalls.length > 0;
    }

    addToolCall(call: ToolCall): void {
        this.toolCalls.push(call);
    }

    addToolOutput(output: ToolOutput): void {
        this.toolOutputs.push(output);
    }

    getToolCalls(): ToolCall[] {
        return [...this.toolCalls];
    }

    getContent(): string {
        return this.content;
    }

    setContent(content: string): void {
        this.content = content;
    }

    getTimestamp(): Date {
        return new Date(this.timestamp);
    }

    clone(): Message {
        const cloned = new Message();
        cloned.id = this.id;
        cloned.role = this.role;
        cloned.content = this.content;
        cloned.timestamp = new Date(this.timestamp);
        cloned.metadata = { ...this.metadata };
        cloned.toolCalls = this.toolCalls.map(call => ({ ...call }));
        cloned.toolOutputs = this.toolOutputs.map(output => ({ ...output }));
        return cloned;
    }

    toJSON(): MessageJSON {
        return {
            id: this.id,
            role: this.role,
            content: this.content,
            timestamp: this.timestamp.toISOString(),
            metadata: { ...this.metadata },
            toolCalls: this.toolCalls.map(call => ({ ...call })),
            toolOutputs: this.toolOutputs.map(output => ({ ...output }))
        };
    }

    static fromJSON(data: MessageJSON): Message {
        const message = new Message();
        message.id = data.id;
        message.role = data.role;
        message.content = data.content;
        message.timestamp = new Date(data.timestamp);
        message.metadata = { ...data.metadata };
        message.toolCalls = data.toolCalls ? [...data.toolCalls] : [];
        message.toolOutputs = data.toolOutputs ? [...data.toolOutputs] : [];
        return message;
    }

    static createUser(content: string): Message {
        const message = new Message();
        message.role = MessageRole.USER;
        message.content = content;
        return message;
    }

    static createAssistant(content: string): Message {
        const message = new Message();
        message.role = MessageRole.ASSISTANT;
        message.content = content;
        return message;
    }

    static createSystem(content: string): Message {
        const message = new Message();
        message.role = MessageRole.SYSTEM;
        message.content = content;
        return message;
    }
}
