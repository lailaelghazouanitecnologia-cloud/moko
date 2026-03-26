export interface IAlu {
  add(dest: number, src: number, size: number): number;
  sub(dest: number, src: number, size: number): number;
  mul(value: number, size: number): number;
  imul(value: number, size: number): number;
  div(value: number, size: number): number;
  idiv(value: number, size: number): number;
  and(dest: number, src: number, size: number): number;
  or(dest: number, src: number, size: number): number;
  xor(dest: number, src: number, size: number): number;
  not(value: number, size: number): number;
}
