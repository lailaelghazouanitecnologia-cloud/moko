import { MicroOp } from './micro-op';

export class MicroOpQueue {
    private queue: MicroOp[];
    private head: number;
    private tail: number;
    private size: number;
    private capacity: number;

    constructor(capacity: number = 64) {
        this.capacity = capacity;
        this.queue = new Array<MicroOp>(capacity);
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }

    enqueue(microOp: MicroOp): boolean {
        if (this.isFull()) {
            return false;
        }
        this.queue[this.tail] = microOp;
        this.tail = (this.tail + 1) % this.capacity;
        this.size++;
        return true;
    }

    dequeue(): MicroOp | null {
        if (this.isEmpty()) {
            return null;
        }
        const microOp = this.queue[this.head];
        this.queue[this.head] = null as any;
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        return microOp;
    }

    peek(): MicroOp | null {
        if (this.isEmpty()) {
            return null;
        }
        return this.queue[this.head];
    }

    isEmpty(): boolean {
        return this.size === 0;
    }

    isFull(): boolean {
        return this.size === this.capacity;
    }

    clear(): void {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
        this.queue.fill(null as any);
    }

    getSize(): number {
        return this.size;
    }

    getCapacity(): number {
        return this.capacity;
    }

    resize(newCapacity: number): void {
        if (newCapacity <= 0) {
            throw new Error('Capacity must be positive');
        }
        if (newCapacity === this.capacity) {
            return;
        }
        const newQueue = new Array<MicroOp>(newCapacity);
        let newIndex = 0;
        while (!this.isEmpty()) {
            const microOp = this.dequeue();
            if (microOp) {
                newQueue[newIndex++] = microOp;
            }
        }
        this.queue = newQueue;
        this.capacity = newCapacity;
        this.head = 0;
        this.tail = newIndex;
        this.size = newIndex;
    }

    flush(): MicroOp[] {
        const ops: MicroOp[] = [];
        while (!this.isEmpty()) {
            const microOp = this.dequeue();
            if (microOp) {
                ops.push(microOp);
            }
        }
        return ops;
    }

    canIssue(): boolean {
        return !this.isEmpty() && this.peek()?.ready === true;
    }

    markCompleted(microOp: MicroOp): void {
        microOp.completed = true;
        microOp.ready = true;
    }

    getReadyOps(): MicroOp[] {
        const readyOps: MicroOp[] = [];
        let index = this.head;
        let count = 0;
        while (count < this.size) {
            const op = this.queue[index];
            if (op && op.ready && !op.completed) {
                readyOps.push(op);
            }
            index = (index + 1) % this.capacity;
            count++;
        }
        return readyOps;
    }

    prioritize(): void {
        const ops = this.flush();
        ops.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        for (const op of ops) {
            this.enqueue(op);
        }
    }

    dependencesResolved(microOp: MicroOp): boolean {
        if (!microOp.dependencies || microOp.dependencies.length === 0) {
            return true;
        }
        for (const dep of microOp.dependencies) {
            if (!dep.completed) {
                return false;
            }
        }
        return true;
    }
}
