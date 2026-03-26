export interface ICpu {
  // Define ICpu interface properties and methods
}

export interface IInstruction {
  // Define IInstruction interface properties and methods
}

export interface IPrefixes {
  // Define IPrefixes interface properties and methods
}

export interface IOpcode {
  // Define IOpcode interface properties and methods
}

export interface IModRm {
  // Define IModRm interface properties and methods
}

export interface ISib {
  // Define ISib interface properties and methods
}

export interface IDecoder {
  decode(cpu: ICpu): IInstruction;
  decodePrefix(bytes: Uint8Array): IPrefixes;
  decodeOpcode(bytes: Uint8Array): IOpcode;
  decodeModRm(byte: number): IModRm;
  decodeSib(byte: number): ISib;
  calculateDisplacement(modRm: IModRm, sib: ISib): number;
  calculateInstructionLength(prefixes: IPrefixes, opcode: IOpcode): number;
}
