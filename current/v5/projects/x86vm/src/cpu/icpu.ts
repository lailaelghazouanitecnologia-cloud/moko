export interface ICpu {
  eax: number;
  ebx: number;
  ecx: number;
  edx: number;
  esi: number;
  edi: number;
  ebp: number;
  esp: number;
  eip: number;
  eflags: number;
  cs: number;
  ds: number;
  es: number;
  fs: number;
  gs: number;
  ss: number;

  getRegister(register: number): number;
  setRegister(register: number, value: number): void;
  getSegment(segment: number): number;
  setSegment(segment: number, selector: number): void;
  getFlag(flag: number): boolean;
  setFlag(flag: number, value: boolean): void;
  switchToRealMode(): void;
  switchToProtectedMode(): void;
  raiseInterrupt(vector: number): void;
  raiseException(vector: number, errorCode: number): void;
}
