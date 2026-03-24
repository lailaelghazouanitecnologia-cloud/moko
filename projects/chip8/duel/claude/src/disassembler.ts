import { Instruction, decode } from './instruction';
import { Word } from './types';

export function disassemble(opcode: Word): string {
  const inst = decode(opcode);
  switch (inst.type) {
    case 'SYS':      return `SYS ${inst.nnn.toString(16).padStart(3, '0').toUpperCase()}`;
    case 'CLS':      return 'CLS';
    case 'RET':      return 'RET';
    case 'JP':       return inst.reg === 'V0' ? `JP V0,${inst.nnn.toString(16).padStart(3, '0').toUpperCase()}` : `JP ${inst.nnn.toString(16).padStart(3, '0').toUpperCase()}`;
    case 'CALL':     return `CALL ${inst.nnn.toString(16).padStart(3, '0').toUpperCase()}`;
    case 'SEB':      return `SE V${inst.x.toString(16).toUpperCase()},${inst.byte.toString(16).padStart(2, '0').toUpperCase()}`;
    case 'SENB':     return `SNE V${inst.x.toString(16).toUpperCase()},${inst.byte.toString(16).padStart(2, '0').toUpperCase()}`;
    case 'SER':      return `SE V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'LDB':      return `LD V${inst.x.toString(16).toUpperCase()},${inst.byte.toString(16).padStart(2, '0').toUpperCase()}`;
    case 'ADDB':     return `ADD V${inst.x.toString(16).toUpperCase()},${inst.byte.toString(16).padStart(2, '0').toUpperCase()}`;
    case 'LD':       return `LD V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'OR':       return `OR V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'AND':      return `AND V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'XOR':      return `XOR V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'ADD':      return `ADD V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'SUB':      return `SUB V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'SHR':      return `SHR V${inst.x.toString(16).toUpperCase()}`;
    case 'SUBN':     return `SUBN V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'SHL':      return `SHL V${inst.x.toString(16).toUpperCase()}`;
    case 'SNER':     return `SNE V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()}`;
    case 'LDI':      return `LD I,${inst.nnn.toString(16).padStart(3, '0').toUpperCase()}`;
    case 'JPV0':     return `JP V0,${inst.nnn.toString(16).padStart(3, '0').toUpperCase()}`;
    case 'RND':      return `RND V${inst.x.toString(16).toUpperCase()},${inst.byte.toString(16).padStart(2, '0').toUpperCase()}`;
    case 'DRW':      return `DRW V${inst.x.toString(16).toUpperCase()},V${inst.y.toString(16).toUpperCase()},${inst.nibble}`;
    case 'SKP':      return `SKP V${inst.x.toString(16).toUpperCase()}`;
    case 'SKNP':     return `SKNP V${inst.x.toString(16).toUpperCase()}`;
    case 'LDDT':     return `LD V${inst.x.toString(16).toUpperCase()},DT`;
    case 'LDK':      return `LD V${inst.x.toString(16).toUpperCase()},K`;
    case 'SDT':      return `LD DT,V${inst.x.toString(16).toUpperCase()}`;
    case 'SST':      return `LD ST,V${inst.x.toString(16).toUpperCase()}`;
    case 'ADDI':     return `ADD I,V${inst.x.toString(16).toUpperCase()}`;
    case 'LDF':      return `LD F,V${inst.x.toString(16).toUpperCase()}`;
    case 'LDBM':     return `LD B,V${inst.x.toString(16).toUpperCase()}`;
    case 'LDMI':     return `LD [I],V${inst.x.toString(16).toUpperCase()}`;
    case 'LDIM':     return `LD V${inst.x.toString(16).toUpperCase()},[I]}`;
    default:         return '???';
  }
}
