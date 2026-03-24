vector: number;
  errorCode?: number;
  instructionPointer: number;
  stackPointer: number;
  flags: number;
}

export class ExceptionHandler {
  private runtime: VMRuntime;
  private interruptVectorTable: number;
  private exceptionStack: ExceptionContext[];

  constructor(runtime: VMRuntime) {
    this.runtime = runtime;
    this.interruptVectorTable = 0x0000;
    this.exceptionStack = [];
  }

  handleException(vector: number, errorCode?: number): void {
    const context: ExceptionContext = {
      vector,
      errorCode,
      instructionPointer: this.runtime['instructionPointer'],
      stackPointer: this.runtime['cpu'].getSP(),
      flags: this.runtime['cpu'].getFlags()
    };

    this.exceptionStack.push(context);
    const handlerAddress = this.getInterruptHandler(vector);
    
    if (handlerAddress === 0) {
      this.handleUnrecoverableException(vector, errorCode);
      return;
    }

    this.pushContextToStack(context);
    this.runtime['instructionPointer'] = handlerAddress;
  }

  handleInterrupt(vector: number): void {
    this.handleException(vector);
  }

  handlePageFault(address: number, accessType: 'read' | 'write' | 'execute'): void {
    const errorCode = (accessType === 'write' ? 0x02 : 0x00) | 0x01;
    this.handleException(0x0E, errorCode);
  }

  handleGeneralProtectionFault(errorCode: number): void {
    this.handleException(0x0D, errorCode);
  0}

  handleDivideByZero(): void {
    this.handleException(0x00);
  }

  handleInvalidOpcode(opcode: number): void {
    this.handleException(0x06);
  }

  handleStackOverflow(): void {
    this.handleException(0x0C);
  }

  private getInterruptHandler(vector: number): number {
    const vectorAddress = this.interruptVectorTable + (vector * 4);
    return this.runtime['memory'].readWord(vectorAddress);
  }

  private pushContextToStack(context: ExceptionContext): void {
    const cpu = this.runtime['cpu'];
    let sp = cpu.getSP();
    
    sp = this.runtime['alu'].sub(sp, 4);
    this.runtime['memory'].write(sp, context.flags);
    
    sp = this.runtime['alu'].sub(sp, 4);
    this.runtime['memory'].write(sp, context.instructionPointer);
    
    if (context.errorCode !== undefined) {
      sp = this.runtime['alu'].sub(sp, 4);
      this.runtime['memory'].write(sp, context.errorCode);
    }
    
    cpu.setSP(sp);
  }

  private handleUnrecoverableException(vector: number, errorCode?: number): void {
    this.runtime['isRunning'] = false;
    throw new Error(`Unrecoverable exception: vector=${vector.toString(16)}, errorCode=${errorCode?.toString(16) || 'none'}`);
  }

  setInterruptVectorTable(address: number): void {
    this.interruptVectorTable = address;
  }

 getExceptionStack(): ExceptionContext[] {
    return [...this.exceptionStack];
  }

 clearExceptionStack(): void {
    this.exceptionStack = [];
  }

  isExceptionPending(): boolean {
    return this.exceptionStack.length > 0;
  }

  getLastException(): ExceptionContext | undefined {
    return this.exceptionStack[this.exceptionStack.length - 1];
  }

  recoverFromException(): boolean {
    if (this.exceptionStack.length === 0) {
      return false;
    }

    const context = this.exceptionStack.pop();
    if (!context) {
      return false;
    }

    this.runtime['instructionPointer'] = context.instructionPointer;
    this.runtime['cpu'].setSP(context.stackPointer);
    this.runtime['cpu'].setFlags(context.flags);
    
    return true;
  }
}
