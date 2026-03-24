import { ByteStream } from '../core';
import { InstructionType, DisplacementType, DecodedInstruction, Operand } from './instruction-decoder';

export class DisplacementFetcher {
    private displacementSize: number = 0;
    private displacementValue: number = 0;

    fetch(bytes: Uint8Array, offset: number, size: number): number {
        let value = 0;
        for (let i = 0; i < size; i++) {
            value |= bytes[offset + i] << (i * 8);
        }
        
        if (size === 1) {
            value = this.signExtend(value & 0xFF, 8);
        } else if (size === 2) {
            value = this.signExtend(value & 0xFFFF, 16);
        }
        
        this.displacementValue = value;
        this.displacementSize = size;
        return value;
    }

    fetch8(bytes: Uint8Array, offset: number): number {
        const value = bytes[offset];
        this.displacementValue = this.signExtend(value, 8);
        this.displacementSize = 1;
        return this.displacementValue;
    }

    fetch16(bytes: Uint8Array, offset: number): number {
        const value = bytes[offset] | (bytes[offset + 1] << 8);
        this.displacementValue = this.signExtend(value, 16);
        this.displacementSize = 2;
        return this.displacementValue;
    }

    fetch32(bytes: Uint8Array, offset: number): number {
        const value = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
        this.displacementValue = value;
        this.displacementSize = 4;
        return value;
    }

    signExtend(value: number, fromBits: number): number {
        const signBit = 1 << (fromBits - 1);
        const mask = (1 << fromBits) - 1;
        value = value & mask;
        return (value ^ signBit) - signBit;
    }

    getDisplacementSize(mod: number, rm: number, hasSIB: boolean): number {
        if (mod === 0) {
            if (rm === 5 && !hasSIB) {
                return 4;
            }
            if (hasSIB) {
                return 0;
            }
            return 0;
        } else if (mod === 1) {
            return 1;
        } else if (mod === 2) {
            return 4;
        }
        return 0;
    }

    needsDisplacement(mod: number): boolean {
        return mod === 1 || mod === 2 || (mod === 0 && rm === 5);
    }

    isRelative(instructionType: InstructionType): boolean {
        return instructionType === InstructionType.JMP || 
               instructionType === InstructionType.JCC ||
               instructionType === InstructionType.CALL ||
               instructionType === InstructionType.LOOP ||
               instructionType === InstructionType.LOOPZ ||
               instructionType === InstructionType.LOOPNZ;
    }

    calculateTargetAddress(displacement: number, currentIP: number): number {
        return currentIP + displacement;
    }

    validateDisplacement(displacement: number, size: number): boolean {
        if (size === 1) {
            return displacement >= -128 && displacement <= 127;
        } else if (size === 2) {
            return displacement >= -32768 && displacement <= 32767;
        } else if (size === 4) {
            return displacement >= -2147483648 && displacement <= 2147483647;
        }
        return false;
    }

    fetchFromStream(stream: ByteStream, size: number): DisplacementInfo {
        const offset = stream.offset;
        const displacement = this.fetch(stream.bytes, offset, size);
        stream.offset += size;
        
        return {
            displacement,
            size,
            offset,
            isSigned: size === 1 || size === 2
        };
    }

    getDisplacementType(mod: number, instruction: DecodedInstruction): DisplacementType {
        if (mod === 0 && instruction.rm === 5) {
            return DisplacementType.RIP_RELATIVE;
        } else if (mod === 1) {
            return DisplacementType.BYTE;
        } else if (mod === 2) {
            return DisplacementType.DWORD;
        } else if (mod === 0 && instruction.hasSIB) {
            return DisplacementType.SIB;
        }
        return DisplacementType.NONE;
    }

    isAbsolute(displacementType: DisplacementType): boolean {
        return displacementType === DisplacementType.DWORD && this.displacementSize === 4;
    }

    getDisplacementOperand(displacement: number, type: DisplacementType): Operand {
        return {
            type: 'displacement',
            value: displacement,
            size: this.displacementSize,
            displacementType: type
        };
    }

    calculateMemoryAddress(base: number, index: number, scale: number, displacement: number): number {
        return base + (index * scale) + displacement;
    }

    handleRipRelative(displacement: number, rip: number): number {
        return rip + displacement;
    }
}
