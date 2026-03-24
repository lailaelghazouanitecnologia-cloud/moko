import { MemoryBus } from '../memory';

export class DMCChannel {
    private enabled: boolean = false;
    private sampleAddress: number = 0;
    private sampleLength: number = 0;
    private currentAddress: number = 0;
    private currentLength: number = 0;
    private shiftRegister: number = 0;
    private bitCount: number = 0;
    private tickPeriod: number = 0;
    private tickValue: number = 0;
    private output: number = 0;
    private outputLevel: number = 0;
    private loop: boolean = false;
    private irq: boolean = false;
    private reader: MemoryBus | null = null;
    private sampleBuffer: number = 0;
    private bufferEmpty: boolean = true;
    private silence: boolean = true;

    private static readonly DMC_RATE_TABLE: number[] = [
        428, 380, 340, 320, 286, 254, 226, 214,
        190, 160, 142, 128, 106, 84, 72, 54
    ];

    writeControl(data: number): void {
        this.irq = (data & 0x80) !== 0;
        this.loop = (data & 0x40) !== 0;
        this.tickPeriod = DMCChannel.DMC_RATE_TABLE[data & 0x0F];
    }

    writeValue(data: number): void {
        this.outputLevel = data & 0x7F;
    }

    writeAddress(data: number): void {
        this.sampleAddress = 0xC000 | (data << 6);
    }

    writeLength(data: number): void {
        this.sampleLength = (data << 4) | 1;
    }

    clock(): void {
        this.readerTick();
        this.outputUnitTick();
    }

    readerTick(): void {
        if (this.bufferEmpty && this.currentLength > 0 && this.reader) {
            this.sampleBuffer = this.reader.read(this.currentAddress);
            this.bufferEmpty = false;
            this.currentAddress = (this.currentAddress + 1) & 0xFFFF;
            if (this.currentAddress === 0) {
                this.currentAddress = 0x8000;
            }
            this.currentLength--;
            if (this.currentLength === 0) {
                if (this.loop) {
                    this.reloadSample();
                } else if (this.irq) {
                    this.irq = true;
                }
            }
        }
    }

    outputUnitTick(): void {
        if (this.tickValue === 0) {
            this.tickValue = this.tickPeriod;
            if (!this.silence) {
                if ((this.shiftRegister & 1) === 1) {
                    if (this.outputLevel <= 125) {
                        this.outputLevel += 2;
                    }
                } else {
                    if (this.outputLevel >= 2) {
                        this.outputLevel -= 2;
                    }
                }
            }
            this.shiftRegister >>= 1;
            this.bitCount--;
            if (this.bitCount === 0) {
                this.bitCount = 8;
                if (this.bufferEmpty) {
                    this.silence = true;
                } else {
                    this.silence = false;
                    this.shiftRegister = this.sampleBuffer;
                    this.bufferEmpty = true;
                }
            }
        } else {
            this.tickValue--;
        }
    }

    getOutput(): number {
        return this.outputLevel;
    }

    setEnabled(enable: boolean): void {
        this.enabled = enable;
        if (!enable) {
            this.currentLength = 0;
        } else if (this.currentLength === 0) {
            this.startSample();
        }
    }

    startSample(): void {
        if (this.currentLength === 0) {
            this.currentAddress = this.sampleAddress;
            this.currentLength = this.sampleLength;
        }
    }

    stopSample(): void {
        this.currentLength = 0;
    }

    reloadSample(): void {
        this.currentAddress = this.sampleAddress;
        this.currentLength = this.sampleLength;
    }

    hasInterrupt(): boolean {
        return this.irq;
    }

    clearInterrupt(): void {
        this.irq = false;
    }

    setReader(reader: MemoryBus): void {
        this.reader = reader;
    }

    reset(): void {
        this.enabled = false;
        this.sampleAddress = 0;
        this.sampleLength = 0;
        this.currentAddress = 0;
        this.currentLength = 0;
        this.shiftRegister = 0;
        this.bitCount = 0;
        this.tickPeriod = 0;
        this.tickValue = 0;
        this.output = 0;
        this.outputLevel = 0;
        this.loop = false;
        this.irq = false;
        this.sampleBuffer = 0;
        this.bufferEmpty = true;
        this.silence = true;
    }

    saveState(): Uint8Array {
        const state = new Uint8Array(17);
        state[0] = this.enabled ? 1 : 0;
        state[1] = this.sampleAddress & 0xFF;
        state[2] = (this.sampleAddress >> 8) & 0xFF;
        state[3] = this.sampleLength & 0xFF;
        state[4] = (this.sampleLength >> 8) & 0xFF;
        state[5] = this.currentAddress & 0xFF;
        state[6] = (this.currentAddress >> 8) & 0xFF;
        state[7] = this.currentLength & 0xFF;
        state[8] = (this.currentLength >> 8) & 0xFF;
        state[9] = this.shiftRegister;
        state[10] = this.bitCount;
        state[11] = this.tickPeriod & 0xFF;
        state[12] = (this.tickPeriod >> 8) & 0xFF;
        state[13] = this.tickValue & 0xFF;
        state[14] = (this.tickValue >> 8) & 0xFF;
        state[15] = this.outputLevel;
        state[16] = (this.loop ? 0x40 : 0) | (this.irq ? 0x80 : 0) | (this.bufferEmpty ? 0x01 : 0) | (this.silence ? 0x02 : 0);
        return state;
    }

    loadState(state: Uint8Array): void {
        this.enabled = state[0] !== 0;
        this.sampleAddress = state[1] | (state[2] << 8);
        this.sampleLength = state[3] | (state[4] << 8);
        this.currentAddress = state[5] | (state[6] << 8);
        this.currentLength = state[7] | (state[8] << 8);
        this.shiftRegister = state[9];
        this.bitCount = state[10];
        this.tickPeriod = state[11] | (state[12] << 8);
        this.tickValue = state[13] | (state[14] << 8);
        this.outputLevel = state[15];
        const flags = state[16];
        this.loop = (flags & 0x40) !== 0;
        this.irq = (flags & 0x80) !== 0;
        this.bufferEmpty = (flags & 0x01) !== 0;
        this.silence = (flags & 0x02) !== 0;
    }
}
