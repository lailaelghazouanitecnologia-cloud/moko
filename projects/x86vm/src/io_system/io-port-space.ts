private devices: Map<number, IODevice> = new Map();
  private portHandlers: Map<number, IODevice> = new Map();
  private interruptController: InterruptController;
  private dmac: DMAC;

  constructor(interruptController: InterruptController, dmac: DMAC) {
    this.interruptController = interruptController;
    this.dmac = dmac;
  }

  registerDevice(device: IODevice, basePort: number, portCount: number): void {
    for (let i = 0; i < portCount; i++) {
      const port = basePort + i;
      this.devices.set(port, device);
      this.portHandlers.set(port, device);
    }
  }

  unregisterDevice(device: IODevice): void {
    const entriesToRemove: number[] = [];
    for (const [port, registeredDevice] of this.devices.entries()) {
      if (registeredDevice === device) {
        entriesToRemove.push(port);
      }
    }
    for (const port of entriesToRemove) {
      this.devices.delete(port);
      this.portHandlers.delete(port);
    }
  }

  readPort(port: number, size: number): number {
    const device = this.portHandlers.get(port);
    if (device) {
      return device.readPort(port, size);
    }
    return 0xFF;
  }

  writePort(port: number, value: number, size: number): void {
    const device = this.portHandlers.get(port);
    if (device) {
      device.writePort(port, value, size);
    }
  }

  handleInterruptRequest(device: IODevice): void {
    const irq = device.getIRQ();
    if (irq >= 0 && irq <= 15) {
      this.interruptController.handleInterruptRequest(device);
    }
  }

  handleDMARequest(channel: number, direction: 'read' | 'write', address: number, count: number): void {
    this.dmac.handleRequest(channel, direction, address, count);
  }

  reset(): void {
    for (const device of this.devices.values()) {
      device.reset();
    }
    this.devices.clear();
    this.portHandlers.clear();
  }

  getDeviceAtPort(port: number): IODevice | undefined {
    return this.portHandlers.get(port);
  }

  getAllDevices(): IODevice[] {
    const uniqueDevices = new Set<IODevice>();
    for (const device of this.devices.values()) {
      uniqueDevices.add(device);
    }
    return Array.from(uniqueDevices);
  }

  isPortInUse(port: number): boolean {
    return this.portHandlers.has(port);
  }

  getPortRange(device: IODevice): { base: number; count: number } | undefined {
    const ports: number[] = [];
    for (const [port, registeredDevice] of this.devices.entries()) {
      if (registeredDevice === device) {
        ports.push(port);
      }
    }
    if (ports.length === 0) return undefined;
    ports.sort((a, b) => a - b);
    let base = ports[0];
    let count = 1;
    for (let i = 1; i < ports.length; i++) {
      if (ports[i] === ports[i - 1] + 1) {
        count++;
      } else {
        break;
      }
    }
    return { base, count };
  }
}
