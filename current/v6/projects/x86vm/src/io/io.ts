import { IIo } from './iio';

export interface IDevice {
  readPort(port: number, size: number): number;

  writePort(port: number, value: number, size: number): void;
}

export class Io implements IIo {
  private readonly devices = new Map<number, IDevice>();
  private readonly permissions: boolean[] = new Array(65536).fill(true);

  readPort(port: number, size: number): number {
    if (port < 0 || port > 65535) {
      throw new RangeError(`Port ${port} out of range`);
    }
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError(`Size must be a positive integer, got ${size}`);
    }
    if (!this.checkPermission(port)) {
      throw new Error(`Permission denied for port ${port}`);
    }
    const device = this.devices.get(port);
    if (!device) {
      return 0;
    }
    return device.readPort(port, size);
  }

  writePort(port: number, value: number, size: number): void {
    if (port < 0 || port > 65535) {
      throw new RangeError(`Port ${port} out of range`);
    }
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError(`Size must be a positive integer, got ${size}`);
    }
    if (!this.checkPermission(port)) {
      throw new Error(`Permission denied for port ${port}`);
    }
    const device = this.devices.get(port);
    if (device) {
      device.writePort(port, value, size);
    }
  }

  registerDevice(port: number, device: IDevice): void {
    if (port < 0 || port > 65535) {
      throw new RangeError(`Port ${port} out of range`);
    }
    this.devices.set(port, device);
  }

  setPortPermission(port: number, allowed: boolean): void {
    if (port < 0 || port > 65535) {
      throw new RangeError(`Port ${port} out of range`);
    }
    this.permissions[port] = allowed;
  }

  hasDevice(port: number): boolean {
    if (port < 0 || port > 65535) {
      throw new RangeError(`Port ${port} out of range`);
    }
    return this.devices.has(port);
  }

  checkPermission(port: number): boolean {
    if (port < 0 || port > 65535) {
      throw new RangeError(`Port ${port} out of range`);
    }
    return this.permissions[port];
  }
}
