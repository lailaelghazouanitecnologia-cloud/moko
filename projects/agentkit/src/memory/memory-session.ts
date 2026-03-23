import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';

export class MemorySession {
    id: string;
    history: Array<any>;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    private context: Record<string, any> = {};

    constructor() {
        this.id = randomUUID();
        this.history = [];
        this.metadata = {};
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    addUserMessage(message: string): void {
        this.history.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });
        this.updatedAt = new Date();
    }

    addAssistantMessage(message: string): void {
        this.history.push({
            role: 'assistant',
            content: message,
            timestamp: new Date()
        });
        this.updatedAt = new Date();
    }

    addToolMessage(toolName: string, args: any, result: any): void {
        this.history.push({
            role: 'tool',
            toolName,
            args,
            result,
            timestamp: new Date()
        });
        this.updatedAt = new Date();
    }

    getHistory(): Array<any> {
        return [...this.history];
    }

    getRecentMessages(count: number): Array<any> {
        return this.history.slice(-count);
    }

    getMessagesByTask(taskId: string): Array<any> {
        return this.history.filter(msg => msg.taskId === taskId);
    }

    clearHistory(): void {
        this.history = [];
        this.updatedAt = new Date();
    }

    trimHistory(maxLength: number): void {
        if (this.history.length > maxLength) {
            this.history = this.history.slice(-maxLength);
            this.updatedAt = new Date();
        }
    }

    updateMetadata(key: string, value: any): void {
        this.metadata[key] = value;
        this.updatedAt = new Date();
    }

    toJSON(): string {
        return JSON.stringify({
            id: this.id,
            history: this.history,
            metadata: this.metadata,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            context: this.context
        });
    }

    static fromJSON(data: string): MemorySession {
        const parsed = JSON.parse(data);
        const session = new MemorySession();
        session.id = parsed.id;
        session.history = parsed.history;
        session.metadata = parsed.metadata;
        session.createdAt = new Date(parsed.createdAt);
        session.updatedAt = new Date(parsed.updatedAt);
        session.context = parsed.context || {};
        return session;
    }

    getContext(): Record<string, any> {
        return { ...this.context };
    }

    setContext(context: Record<string, any>): void {
        this.context = { ...context };
        this.updatedAt = new Date();
    }

    async evaluate(task: string, plan: string): Promise<boolean> {
        const taskMessages = this.history.filter(msg => 
            msg.content && msg.content.includes(task)
        );
        const planSteps = plan.split('\n').filter(step => step.trim());
        
        const completedSteps = planSteps.filter(step => 
            taskMessages.some(msg => msg.content.includes(step.trim()))
        );
        
        return completedSteps.length === planSteps.length;
    }

    async save(path: string): Promise<void> {
        const data = this.toJSON();
        await fs.writeFile(path, data, 'utf8');
    }
}
