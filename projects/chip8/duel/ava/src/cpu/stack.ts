export class Stack {
    private stack: number[];
    private pointer: number;

    constructor() {
        this.stack = [];
        this.pointer = -1;
    }

    push(address: number): void {
        if (this.isFull()) {
            throw new Error('Stack overflow');
        }
        this.pointer++;
        this.stack[this.pointer] = address;
    }

    pop(): number {
        if (this.isEmpty()) {
            throw new Error('Stack underflow');
        }
        const address = this.stack[this.pointer];
        this.pointer--;
        return address;
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
        this.stack = [];
        this.pointer = -1;
    }

    getDepth(): number {
        return this.pointer + 1;
    }
}
