import { IODevice } from './io-device';
import { PortHandler } from './port-handler';

export class IOPortSpace {
    private ports: Map<number, IODevice> = new Map();
    private handlers: Map<number, PortHandler> = new Map();

    registerDevice(port: number, device: IODevice): void {
        if (port < 0x0000 || port > 0xFFFF) {
            throw new Error(`Port ${port} out of range (0x0000-0xFFFF)`);
        }
        this.ports.set(port, device);
    }

    unregisterDevice(port: number): void {
        this.ports.delete(port);
    }

    readPort(port: number): number {
        if (port < 0x0000 || port > 0xFFFF) {
            throw new Error(`Port ${port} out of range (0x0000-0xFFFF)`);
        }
        const device = this.ports.get(port);
        if (!device) {
            return 0xFF;
        }
        return device.readPort(port);
    }

    writePort(port: number, value: number): void {
        if (port < 0x0000 || port > 0xFFFF) {
            throw new Error(`Port ${port} out of range (0x0000-0xFFFF)`);
        }
        const device = this.ports.get(port);
        if (device) {
            device.writePort(port, value);
        }
    }

    isPortRegistered(port: number): boolean {
        return this.ports.has(port);
    }

    getDevice(port: number): IODevice | undefined {
        return this.ports.get(port);
    }

    reset(): void {
        this.ports.clear();
        this.handlers.clear();
    }

    getRegisteredPorts(): number[] {
        return Array.from(this.ports.keys()).sort((a, b) => a - b);
    }

    registerRange(start: number, count: number, device: IODevice): void {
        if (start < 0x0000 || start + count - 1 > 0xFFFF) {
            throw new Error(`Port range ${start}-${start + count - 1} out of range (0x0000-0xFFFF)`);
        }
        for (let i = 0; i < count; i++) {
            this.registerDevice(start + i, device);
        }
    }

    unregisterRange(start: number, count: number): void {
        if (start < 0x0000 || start + count - 1 > 0xFFFF) {
            throw new Error(`Port range ${start}-${start + count - 1} out of range (0x0000-0xFFFF)`);
        }
        for (let i = 0; i < count; i++) {
            this.unregisterDevice(start + i);
        }
    }
}
