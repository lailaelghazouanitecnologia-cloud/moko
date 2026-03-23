export class ToolResult {
    callId: string;
    success: boolean;
    data: any;
    error: string;

    constructor(callId: string, success: boolean, data?: any, error?: string) {
        this.callId = callId;
        this.success = success;
        this.data = data;
        this.error = error || '';
    }

    isSuccess(): boolean {
        return this.success;
    }

    getData(): any {
        if (!this.success) {
            throw new Error(`Tool execution failed: ${this.error}`);
        }
        return this.data;
    }

    getError(): string {
        return this.error;
    }

    toJSON(): object {
        return {
            callId: this.callId,
            success: this.success,
            data: this.success ? this.data : undefined,
            error: this.success ? undefined : this.error
        };
    }

    static success(callId: string, data: any): ToolResult {
        return new ToolResult(callId, true, data);
    }

    static error(callId: string, error: string): ToolResult {
        return new ToolResult(callId, false, undefined, error);
    }
}
