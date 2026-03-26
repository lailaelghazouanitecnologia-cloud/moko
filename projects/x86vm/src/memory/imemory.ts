export interface IMemory {
  readonly pagingEnabled: boolean;
  read(address: number, size: number): number;
  write(address: number, value: number, size: number): void;
  readPhysical(address: number, size: number): number;
  writePhysical(address: number, value: number, size: number): void;
  translateAddress(linear: number): number;
  checkSegmentAccess(segment: number, offset: number, write: boolean): void;
  enablePaging(): void;
  disablePaging(): void;
  loadPageDirectory(address: number): void;
}
