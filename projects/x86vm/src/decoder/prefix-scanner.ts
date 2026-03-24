import { PrefixInfo, PrefixType, PrefixScanResult, SegmentRegister, RepType, RexInfo } from '../types';
import { CpuMode } from '../types';

export class PrefixScanner {
  private prefixes: PrefixInfo;
  private offset: number;

  constructor() {
    this.prefixes = {
      hasLock: false,
      hasRep: false,
      hasRepne: false,
      hasSegmentOverride: false,
      segmentOverride: SegmentRegister.DS,
      hasOperandSizeOverride: false,
      hasAddressSizeOverride: false,
      hasRex: false,
      rexInfo: null,
      hasVex: false,
      vexInfo: null,
      count: 0
    };
    this.offset = 0;
  }

  scan(bytes: Uint8Array, offset: number): PrefixScanResult {
    this.prefixes = {
      hasLock: false,
      hasRep: false,
      hasRepne: false,
      hasSegmentOverride: false,
      segmentOverride: SegmentRegister.DS,
      hasOperandSizeOverride: false,
      hasAddressSizeOverride: false,
      hasRex: false,
      rexInfo: null,
      hasVex: false,
      vexInfo: null,
      count: 0
    };

    let currentOffset = offset;
    let prefixCount = 0;

    while (currentOffset < bytes.length && this.isPrefix(bytes[currentOffset])) {
      const byte = bytes[currentOffset];
      const prefixType = this.getPrefixType(byte);

      switch (prefixType) {
        case PrefixType.LOCK:
          this.processLock(this.prefixes);
          break;
        case PrefixType.REP:
        case PrefixType.REPNE:
          this.processRep(this.prefixes, byte);
          break;
        case PrefixType.SEGMENT:
          this.processSegment(this.prefixes, byte);
          break;
        case PrefixType.OPERAND_SIZE:
          this.processOperandSize(this.prefixes);
          break;
        case PrefixType.ADDRESS_SIZE:
          this.processAddressSize(this.prefixes);
          break;
        case PrefixType.REX:
          this.processRex(this.prefixes, byte);
          break;
        case PrefixType.VEX:
          currentOffset = this.processVex(this.prefixes, bytes, currentOffset);
          prefixCount++;
          break;
      }

      currentOffset++;
      prefixCount++;
    }

    this.prefixes.count = prefixCount;

    return {
      prefixes: this.prefixes,
      nextOffset: currentOffset,
      length: currentOffset - offset
    };
  }

  isPrefix(byte: number): boolean {
    return this.getPrefixType(byte) !== PrefixType.NONE;
  }

  getPrefixType(byte: number): PrefixType {
    switch (byte) {
      case 0xF0: return PrefixType.LOCK;
      case 0xF3: return PrefixType.REP;
      case 0xF2: return PrefixType.REPNE;
      case 0x2E: return PrefixType.SEGMENT;
      case 0x36: return PrefixType.SEGMENT;
      case 0x3E: return PrefixType.SEGMENT;
      case 0x26: return PrefixType.SEGMENT;
      case 0x64: return PrefixType.SEGMENT;
      case 0x65: return PrefixType.SEGMENT;
      case 0x66: return PrefixType.OPERAND_SIZE;
      case 0x67: return PrefixType.ADDRESS_SIZE;
      default:
        if (byte >= 0x40 && byte <= 0x4F) {
          return PrefixType.REX;
        }
        if (byte === 0xC4 || byte === 0xC5) {
          return PrefixType.VEX;
        }
        return PrefixType.NONE;
    }
  }

  processLock(info: PrefixInfo): void {
    info.hasLock = true;
  }

  processRep(info: PrefixInfo, byte: number): void {
    if (byte === 0xF3) {
      info.hasRep = true;
    } else if (byte === 0xF2) {
      info.hasRepne = true;
    }
  }

  processSegment(info: PrefixInfo, byte: number): void {
    info.hasSegmentOverride = true;
    switch (byte) {
      case 0x2E: info.segmentOverride = SegmentRegister.CS; break;
      case 0x36: info.segmentOverride = SegmentRegister.SS; break;
      case 0x3E: info.segmentOverride = SegmentRegister.DS; break;
      case 0x26: info.segmentOverride = SegmentRegister.ES; break;
      case 0x64: info.segmentOverride = SegmentRegister.FS; break;
      case 0x65: info.segmentOverride = SegmentRegister.GS; break;
    }
  }

  processOperandSize(info: PrefixInfo): void {
    info.hasOperandSizeOverride = true;
  }

  processAddressSize(info: PrefixInfo): void {
    info.hasAddressSizeOverride = true;
  }

  processRex(info: PrefixInfo, byte: number): void {
    info.hasRex = true;
    info.rexInfo = {
      isRex: true,
      w: (byte & 0x08) !== 0,
      r: (byte & 0x04) !== 0,
      x: (byte & 0x02) !== 0,
      b: (byte & 0x01) !== 0,
      value: byte
    };
  }

  processVex(info: PrefixInfo, bytes: Uint8Array, offset: number): number {
    info.hasVex = true;
    const vexByte = bytes[offset];
    
    if (vexByte === 0xC5) {
      info.vexInfo = {
        isVex: true,
        isTwoByte: true,
        byte1: bytes[offset],
        byte2: bytes[offset + 1],
        byte3: 0
      };
      return offset + 1;
    } else {
      info.vexInfo = {
        isVex: true,
        isTwoByte: false,
        byte1: bytes[offset],
        byte2: bytes[offset + 1],
        byte3: bytes[offset + 2]
      };
      return offset + 2;
    }
  }

  getPrefixCount(bytes: Uint8Array, offset: number): number {
    let count = 0;
    let currentOffset = offset;

    while (currentOffset < bytes.length && this.isPrefix(bytes[currentOffset])) {
      const prefixType = this.getPrefixType(bytes[currentOffset]);
      
      if (prefixType === PrefixType.VEX) {
        if (bytes[currentOffset] === 0xC5) {
          currentOffset += 2;
        } else {
          currentOffset += 3;
        }
      } else {
        currentOffset++;
      }
      count++;
    }

    return count;
  }

  hasOperandSizeOverride(info: PrefixInfo): boolean {
    return info.hasOperandSizeOverride;
  }

  hasAddressSizeOverride(info: PrefixInfo): boolean {
    return info.hasAddressSizeOverride;
  }

  getSegmentOverride(info: PrefixInfo): SegmentRegister {
    return info.segmentOverride;
  }

  getRepType(info: PrefixInfo): RepType {
    if (info.hasRep) return RepType.REP;
    if (info.hasRepne) return RepType.REPNE;
    return RepType.NONE;
  }

  isRexActive(info: PrefixInfo): boolean {
    return info.hasRex && info.rexInfo !== null;
  }

  getRexInfo(info: PrefixInfo): RexInfo | null {
    return info.rexInfo;
  }

  validatePrefixes(info: PrefixInfo): boolean {
    if (info.hasLock && (info.hasRep || info.hasRepne)) {
      return false;
    }

    if (info.hasRep && info.hasRepne) {
      return false;
    }

    return true;
  }

  getScanLength(bytes: Uint8Array, offset: number): number {
    const startOffset = offset;
    let currentOffset = offset;

    while (currentOffset < bytes.length && this.isPrefix(bytes[currentOffset])) {
      const prefixType = this.getPrefixType(bytes[currentOffset]);
      
      if (prefixType === PrefixType.VEX) {
        if (bytes[currentOffset] === 0xC5) {
          currentOffset += 2;
        } else {
          currentOffset += 3;
        }
      } else {
        currentOffset++;
      }
    }

    return currentOffset - startOffset;
  }
}
