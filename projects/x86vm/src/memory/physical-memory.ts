private memory: Uint8Array;
    private size: number;
    private allocatedBlocks: Set<number>;

    constructor(size: number) {
        this.size = size;
        this.memory = new Uint8Array(size);
        this.allocatedBlocks = new Set<number>();
    }

    read(address: number): number {
        if (!this.isValidAddress(address)) {
            throw new Error(`Invalid physical address: 0x${address.toString(16)}`);
        }
        return this.memory[address];
    }

    write(address: number, value: number): void {
        if (!this.isValidAddress(address)) {
            throw new Error(`Invalid physical address: 0x${address.toString(16)}`);
        }
        this.memory[address] = value & 0xFF;
    }

    readWord(address: number): number {
        if (!this.isValidAddress(address) || !this.isValidAddress(address + 1)) {
            throw new Error(`Invalid physical address range: 0x${address.toString(16)}`);
        }
        return this.memory[address] | (this.memory[address + 1] << 8);
    }

    writeWord(address: number, value: number): void {
        if (!this.isValidAddress(address) || !this.isValidAddress(address + 1)) {
            throw new Error(`Invalid physical address range: 0x${address.toString(16)}`);
        }
        this.memory[address] = value & 0xFF;
        this.memory[address + 1] = (value >> 8) & 0xFF;
    }

    readDWord(address: number): number {
        if (!this.isValidAddress(address) || !this.isValidAddress(address + 3)) {
            throw new Error(`Invalid physical address range: 0x${address.toString(16)}`);
        }
        return this.memory[address] |
               (this.memory[address + 1] << 8) |
               (this.memory[address + 2] << 16) |
               (this.memory[address + 3] << 24);
    }

    writeDWord(address: number, value: number): void {
        if (!this.isValidAddress(address) || !this.isValidAddress(address + 3)) {
            throw new Error(`Invalid physical address range: 0x${address.toString(16)}`);
        }
        this.memory[address] = value & 0xFF;
        this.memory[address + 1] = (value >> 8) & 0xFF;
        this.memory[address + 2] = (value >> 16) & 0xFF;
        this.memory[address + 3] = (value >> 24) & 0xFF;
    }

    allocateBlock(size: number): number {
        const blockSize = Math.ceil(size / 4096) * 4096;
        let address = 0;
        
        while (address < this.size) {
            let canAllocate = true;
            for (let i = 0; i < blockSize; i += 4096) {
                if (this.allocatedBlocks.has(address + i)) {
                    canAllocate = false;
                    break;
                }
            }
            
            if (canAllocate) {
                for (let i = 0; i < blockSize; i += 4096) {
                    this.allocatedBlocks.add(address + i);
                }
                return address;
            }
            
            address += 4096;
        }
        
        throw new Error('Out of physical memory');
    }

    freeBlock(address: number): void {
        if (!this.allocatedBlocks.has(address)) {
            throw new Error(`Block not allocated at address: 0x${address.toString(16)}`);
        }
        
        let currentAddress = address;
        while (this.allocatedBlocks.has(currentAddress)) {
            this.allocatedBlocks.delete(currentAddress);
            currentAddress += 4096;
        }
    }

    isValidAddress(address: number): boolean {
        return address >= 0 && address < this.size;
    }

    getSize(): number {
        return this.size;
    }

    dump(start: number, length: number): number[] {
        if (!this.isValidAddress(start) || !this.isValidAddress(start + length - 1)) {
            throw new Error(`Invalid dump range: start=0x${start.toString(16)}, length=${length}`);
        }
        
        const result: number[] = [];
        for (let i = 0; i < length; i++) {
            result.push(this.memory[start + i]);
        }
        return result;
    }
}
