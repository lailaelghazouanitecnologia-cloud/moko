private protectionLevels: Map<number, number>;
  private currentPrivilege: number;

  constructor() {
    this.protectionLevels = new Map<number, number>();
    this.currentPrivilege = 0;
  }

  setPrivilegeLevel(level: number): void {
    this.currentPrivilege = level & 0x3;
  }

  getPrivilegeLevel(): number {
    return this.currentPrivilege;
  }

  checkReadAccess(address: number): boolean {
    const pageAddress = address & 0xFFFFF000;
    const flags = this.protectionLevels.get(pageAddress);
    
    if (flags === undefined) {
      return false;
    }

    const present = (flags & 0x1) !== 0;
    const userAccessible = (flags & 0x4) !== 0;
    const readWrite = (flags & 0x2) !== 0;

    if (!present) {
      return false;
    }

    if (this.currentPrivilege === 0) {
      return true;
    }

    return userAccessible;
  }

  checkWriteAccess(address: number): boolean {
    const pageAddress = address & 0xFFFFF000;
    const flags = this.protectionLevels.get(pageAddress);
    
    if (flags === undefined) {
      return false;
    }

    const present = (flags & 0x1) !== 0;
    const userAccessible = (flags & 0x4) !== 0;
    const readWrite = (flags & 0x2) !== 0;

    if (!present) {
      return false;
    }

    if (this.currentPrivilege === 0) {
      return readWrite;
    }

    return userAccessible && readWrite;
  }

  checkExecuteAccess(address: number): boolean {
    const pageAddress = address & 0xFFFFF000;
    const flags = this.protectionLevels.get(pageAddress);
    
    if (flags === undefined) {
      return false;
    }

    const present = (flags & 0x1) !== 0;
    const userAccessible = (flags & 0x4) !== 0;
    const noExecute = (flags & 0x8000000000000000) !== 0;

    if (!present) {
      return false;
    }

    if (noExecute) {
      return false;
    }

    if (this.currentPrivilege === 0) {
      return true;
    }

    return userAccessible;
  }

  setPageProtection(address: number, flags: number): void {
    const pageAddress = address & 0xFFFFF000;
    this.protectionLevels.set(pageAddress, flags);
  }

  handleProtectionFault(address: number, access: number): void {
    const pageAddress = address & 0xFFFFF000;
    const flags = this.protectionLevels.get(pageAddress);
    
    if (flags === undefined) {
      this.raisePageFault(address, false);
      return;
    }

    const present = (flags & 0x1) !== 0;
    
    if (!present) {
      this.raisePageFault(address, false);
      return;
    }

    const userAccessible = (flags & 0x4) !== 0;
    const readWrite = (flags & 0x2) !== 0;

    if (access === 0) {
      if (!this.checkReadAccess(address)) {
        this.raisePageFault(address, true);
      }
    } else if (access === 1) {
      if (!this.checkWriteAccess(address)) {
        this.raisePageFault(address, true);
      }
    } else if (access === 2) {
      if (!this.checkExecuteAccess(address)) {
        this.raisePageFault(address, true);
      }
    }
  }

  canAccessPage(virtual: number, access: number): boolean {
    const pageAddress = virtual & 0xFFFFF000;
    const flags = this.protectionLevels.get(pageAddress);
    
    if (flags === undefined) {
      return false;
    }

    const present = (flags & 0x1) !== 0;
    
    if (!present) {
      return false;
    }

    if (access === 0) {
      return this.checkReadAccess(virtual);
    } else if (access === 1) {
      return this.checkWriteAccess(virtual);
    } else if (access === 2) {
      return this.checkExecuteAccess(virtual);
    }

    return false;
  }

  raisePageFault(address: number, present: boolean): void {
    const pageAddress = address & 0xFFFFF000;
    const errorCode = (present ? 0x1 : 0x0) | ((this.currentPrivilege !== 0) ? 0x4 : 0x0);
    
    throw new PageFaultException(address, errorCode);
  }

  getAccessFlags(address: number): number {
    const pageAddress = address & 0xFFFFF000;
    return this.protectionLevels.get(pageAddress) || 0;
  }
}

export class PageFaultException extends Error {
  constructor(public address: number, public errorCode: number) {
    super(`Page fault at 0x${address.toString(16)} (error code: 0x${errorCode.toString(16)})`);
  }
}
