export class Stack {
    private stack: Uint16Array;
    private pointer: number;

    constructor() {
        this.stack = new Uint16Array(16);
        this.pointer = -1;
    }

    push(value: number): void {
        if (this.isFull()) {
            throw new Error('Stack overflow');
        }
        this.pointer++;
        this.stack[this.pointer] = value;
    }

    pop(): number {
        if (this.isEmpty()) {
            throw new Error('Stack underflow');
        }
        const value = this.stack[this.pointer];
        this.pointer--;
        return value;
    }

    peek(): number {
        if (this.isEmpty()) {
            throw new Error('Stack is empty');
        }
        return this.stack[this.pointer];
    }

    isEmpty(): boolean {
        return this.pointer === -1;
    }

    isFull(): boolean {
        return this.pointer === 15;
    }

    clear(): void {
        this.pointer = -1;
    }

    size(): number {
        return this.pointer + 1;
    }
}
