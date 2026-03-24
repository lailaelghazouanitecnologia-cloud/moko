public device: IODevice,
        public port: number
    ) {}
}

export class IOPortSpace {
    private ports: Map<number, IOPort> = new Map();
    private deviceMap: Map<number, IODevice> = new Map();

    registerDevice(device: IODevice, basePort: number, portCount: number): void {
        if (!this.checkPortRange(basePort, portCount)) {
            throw new Error(`Port range ${basePort}-${basePort + portCount - 1} is not available`);
        }

        for (let i = 0; i < portCount; i++) {
            const port = basePort + i;
            const ioPort = new IOPort(device, port);
            this.ports.set(port, ioPort);
            this.deviceMap.set(port, device);
        }
    }

    readPort(port: number, size: IOSize): number {
        const ioPort = this.ports.get(port);
        if (!ioPort) {
            return 0xFFFFFFFF;
        }
        return ioPort.device.read(port, size);
    }

    writePort(port: number, value: number, size: IOSize): void {
        const ioPort = this.ports.get(port);
        if (!ioPort) {
            return;
        }
        ioPort.device.write(port, value, size);
    }

    getDevice(port: number): IODevice | null {
        return this.deviceMap.get(port) || null;
    }

    checkPortRange(basePort: number, count: number): boolean {
        for (let i = 0; i < count; i++) {
            const port = basePort + i;
            if (this.ports.has(port)) {
                return false;
            }
        }
        return true;
    }

    unregisterDevice(device: IODevice): void {
        const portsToRemove: number[] = [];
        
        for (const [port, ioPort] of this.ports) {
            if (ioPort.device === device) {
                portsToRemove.push(port);
            }
        }

        for (const port of portsToRemove) {
            this.ports.delete(port);
            this.deviceMap.delete(port);
        }
    }

    reset(): void {
        this.ports.clear();
        this.deviceMap.clear();
    }
}
