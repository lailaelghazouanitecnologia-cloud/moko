private base: number = 0;
    private limit: number = 0;
    private access: number = 0;
    private flags: number = 0;
    private selector: number = 0;

    static fromBytes(bytes: Uint8Array): SegmentDescriptor {
        if (bytes.length !== 8) {
            throw new Error('Segment descriptor must be 8 bytes');
        }

        const desc = new SegmentDescriptor();
        
        // Parse base address (bits 16-39 and 56-63)
        desc.base = (bytes[2] | (bytes[3] << 8) | (bytes[4] << 16) | (bytes[7] << 24)) & 0xFFFFFFFF;
        
        // Parse limit (bits 0-15 and 48-51)
        desc.limit = (bytes[0] | (bytes[1] << 8) | ((bytes[6] & 0x0F) << 16)) & 0xFFFFF;
        
        // Parse access byte (bits 40-47)
        desc.access = bytes[5];
        
        // Parse flags (bits 52-55)
        desc.flags = (bytes[6] >> 4) & 0x0F;
        
        return desc;
    }

    toBytes(): Uint8Array {
        const bytes = new Uint8Array(8);
        
        // Serialize limit (bits 0-15)
        bytes[0] = this.limit & 0xFF;
        bytes[1] = (this.limit >> 8) & 0xFF;
        
        // Serialize base (bits 16-39)
        bytes[2] = this.base & 0xFF;
        bytes[3] = (this.base >> 8) & 0xFF;
        bytes[4] = (this.base >> 16) & 0xFF;
        
        // Serialize access byte (bits 40-47)
        bytes[5] = this.access;
        
        // Serialize flags and limit high bits (bits 48-55)
        bytes[6] = ((this.limit >> 16) & 0x0F) | ((this.flags & 0x0F) << 4);
        
        // Serialize base high byte (bits 56-63)
        bytes[7] = (this.base >> 24) & 0xFF;
        
        return bytes;
    }

    getBase(): number {
        return this.base;
    }

    getLimit(): number {
        const granularity = this.getGranularity();
        return granularity ? (this.limit << 12) | 0xFFF : this.limit;
    }

    getAccess(): number {
        return this.access;
    }

    getGranularity(): boolean {
        return (this.flags & 0x08) !== 0;
    }

    isPresent(): boolean {
        return (this.access & 0x80) !== 0;
    }

    getDPL(): number {
        return (this.access >> 5) & 0x03;
    }

    isSystem(): boolean {
        return (this.access & 0x10) === 0;
    }

    getType(): number {
        return this.access & 0x0F;
    }

    isCode(): boolean {
        return (this.access & 0x18) === 0x18;
    }

    isData(): boolean {
        return (this.access & 0x18) === 0x10;
    }

    isTSS(): boolean {
        return this.isSystem() && (this.getType() === 0x09 || this.getType() === 0x0B);
    }

    isConforming(): boolean {
        return this.isCode() && (this.access & 0x04) !== 0;
    }

    isReadable(): boolean {
        return this.isCode() && (this.access & 0x02) !== 0;
    }

    isWritable(): boolean {
        return this.isData() && (this.access & 0x02) !== 0;
    }

    isAccessed(): boolean {
        return (this.access & 0x01) !== 0;
    }

    setAccessed(accessed: boolean): void {
        if (accessed) {
            this.access |= 0x01;
        } else {
            this.access &= ~0x01;
        }
    }

    expandDown(): boolean {
        return this.isData() && (this.access & 0x04) !== 0;
    }

    validate(): boolean {
        // Check if descriptor is present
        if (!this.isPresent()) {
            return false;
        }

        // Validate type field
        const type = this.getType();
        
        if (this.isSystem()) {
            // System segment types
            const validSystemTypes = [0x01, 0x02, 0x03, 0x04, 0x05, 0x09, 0x0B, 0x0C];
            if (!validSystemTypes.includes(type)) {
                return false;
            }
        } else {
            // Code/Data segment types
            if (this.isCode()) {
                // Code segment: check reserved bits
                if ((type & 0x08) === 0) {
                    return false;
                }
            } else {
                // Data segment: check reserved bits
                if ((type & 0x08) !== 0) {
                    return false;
                }
            }
        }

        // Validate limit
        const limit = this.getLimit();
        if (limit > 0xFFFFFFFF) {
            return false;
        }

        // Validate base
        if (this.base > 0xFFFFFFFF) {
            return false;
        }

        return true;
    }
}
