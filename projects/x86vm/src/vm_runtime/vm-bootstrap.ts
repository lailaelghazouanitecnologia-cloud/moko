memorySize: number;
  stackSize: number;
  heapSize: number;
  entryPoint: number;
  interruptVectorTable: number;
}

export class VMBootstrap {
  private runtime: VMRuntime;
  private engine: ExecutionEngine;
  private exceptionHandler: ExceptionHandler;
  private config: VMConfig;

  constructor(config: VMConfig) {
    this.config = config;
    this.runtime = new VMRuntime();
    this.engine = new ExecutionEngine(this.runtime);
    this.exceptionHandler = new ExceptionHandler();
  }

  initialize(): void {
    this.runtime.initialize(this.config);
    this.runtime.loadProgram(new Uint8Array(0));
    this.runtime.reset();
  }

  start(): void {
    this.runtime.start();
  }

  stop(): void {
    this.runtime.stop();
  }

  step(): void {
    this.runtime.step();
  }

  reset(): void {
    this.runtime.reset();
  }

  loadProgram(program: Uint8Array): void {
    this.runtime.loadProgram(program);
  }

  getRegister(name: string): number {
    return this.runtime.getRegister(name);
  }

  setRegister(name: string, value: number): void {
    this.runtime.setRegister(name, value);
  }

  readMemory(address: number): number {
    return this.runtime.readMemory(address);
  }

  writeMemory(address: number, value: number): void {
    this.runtime.writeMemory(address, value);
  }

  handleException(vector: number): void {
    this.exceptionHandler.handle(vector);
  }

  isRunning(): boolean {
    return this.runtime.isRunning();
  }

  getInstructionPointer(): number {
    return this.runtime.getInstructionPointer();
  }

  setInstructionPointer(address: number): void {
    this.runtime.setInstructionPointer(address);
  }

  getCycleCount(): number {
    return this.engine.getCycleCount();
  }

  getRuntime(): VMRuntime {
    return this.runtime;
  }

  getEngine(): ExecutionEngine {
    return this.engine;
  }

  getExceptionHandler(): ExceptionHandler {
    return this.exceptionHandler;
  }
}
