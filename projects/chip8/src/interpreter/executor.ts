import { CPU } from './cpu';
import { Memory } from './memory';
import { Display } from './display';
import { Keypad } from './keypad';
import { Random } from './random';
import { Instruction } from './instruction';

export class Executor {
    private cpu: CPU;
    private memory: Memory;
    private display: Display;
    private keypad: Keypad;
    private random: Random;

    constructor(cpu: CPU, memory: Memory, display: Display, keypad: Keypad, random: Random) {
        this.cpu = cpu;
        this.memory = memory;
        this.display = display;
        this.keypad = keypad;
        this.random = random;
    }

    execute(instruction: Instruction): void {
        const opcode = instruction.opcode;
        
        switch (opcode & 0xF000) {
            case 0x0000:
                if (opcode === 0x00E0) {
                    this.executeClear(instruction);
                } else if (opcode === 0x00EE) {
                    this.executeReturn(instruction);
                }
                break;
            case 0x1000:
                this.executeJump(instruction);
                break;
            case 0x2000:
                this.executeCall(instruction);
                break;
            case 0x3000:
                this.executeSkipEqual(instruction);
                break;
            case 0x4000:
                this.executeSkipNotEqual(instruction);
                break;
            case 0x5000:
                this.executeSkipRegEqual(instruction);
                break;
            case 0x6000:
                this.executeLoad(instruction);
                break;
            case 0x7000:
                this.executeAdd(instruction);
                break;
            case 0x8000:
                const subcode = opcode & 0x000F;
                switch (subcode) {
                    case 0x0:
                        this.executeAssign(instruction);
                        break;
                    case 0x1:
                        this.executeOr(instruction);
                        break;
                    case 0x2:
                        this.executeAnd(instruction);
                        break;
                    case 0x3:
                        this.executeXor(instruction);
                        break;
                    case 0x4:
                        this.executeAddReg(instruction);
                        break;
                    case 0x5:
                        this.executeSub(instruction);
                        break;
                    case 0x6:
                        this.executeShiftRight(instruction);
                        break;
                    case 0x7:
                        this.executeSubReverse(instruction);
                        break;
                    case 0xE:
                        this.executeShiftLeft(instruction);
                        break;
                }
                break;
            case 0x9000:
                this.executeSkipRegNotEqual(instruction);
                break;
            case 0xA000:
                this.executeLoadIndex(instruction);
                break;
            case 0xB000:
                this.executeJumpOffset(instruction);
                break;
            case 0xC000:
                this.executeRandom(instruction);
                break;
            case 0xD000:
                this.executeDraw(instruction);
                break;
            case 0xE000:
                const keycode = opcode & 0x00FF;
                if (keycode === 0x9E) {
                    this.executeSkipKey(instruction);
                } else if (keycode === 0xA1) {
                    this.executeSkipNotKey(instruction);
                }
                break;
            case 0xF000:
                const fcode = opcode & 0x00FF;
                switch (fcode) {
                    case 0x07:
                        this.executeGetDelay(instruction);
                        break;
                    case 0x0A:
                        this.executeWaitKey(instruction);
                        break;
                    case 0x15:
                        this.executeSetDelay(instruction);
                        break;
                    case 0x18:
                        this.executeSetSound(instruction);
                        break;
                    case 0x1E:
                        this.executeAddIndex(instruction);
                        break;
                    case 0x29:
                        this.executeFontChar(instruction);
                        break;
                    case 0x33:
                        this.executeBCD(instruction);
                        break;
                    case 0x55:
                        this.executeStore(instruction);
                        break;
                    case 0x65:
                        this.executeLoadMem(instruction);
                        break;
                }
                break;
        }
    }

    executeClear(instruction: Instruction): void {
        this.display.clear();
    }

    executeReturn(instruction: Instruction): void {
        this.cpu.pc = this.cpu.stack[this.cpu.sp];
        this.cpu.sp--;
    }

    executeJump(instruction: Instruction): void {
        this.cpu.pc = instruction.nnn;
    }

    executeCall(instruction: Instruction): void {
        this.cpu.sp++;
        this.cpu.stack[this.cpu.sp] = this.cpu.pc;
        this.cpu.pc = instruction.nnn;
    }

    executeSkipEqual(instruction: Instruction): void {
        if (this.cpu.v[instruction.x] === instruction.nn) {
            this.cpu.pc += 2;
        }
    }

    executeSkipNotEqual(instruction: Instruction): void {
        if (this.cpu.v[instruction.x] !== instruction.nn) {
            this.cpu.pc += 2;
        }
    }

    executeSkipRegEqual(instruction: Instruction): void {
        if (this.cpu.v[instruction.x] === this.cpu.v[instruction.y]) {
            this.cpu.pc += 2;
        }
    }

    executeLoad(instruction: Instruction): void {
        this.cpu.v[instruction.x] = instruction.nn;
    }

    executeAdd(instruction: Instruction): void {
        this.cpu.v[instruction.x] = (this.cpu.v[instruction.x] + instruction.nn) & 0xFF;
    }

    executeAssign(instruction: Instruction): void {
        this.cpu.v[instruction.x] = this.cpu.v[instruction.y];
    }

    executeOr(instruction: Instruction): void {
        this.cpu.v[instruction.x] |= this.cpu.v[instruction.y];
    }

    executeAnd(instruction: Instruction): void {
        this.cpu.v[instruction.x] &= this.cpu.v[instruction.y];
    }

    executeXor(instruction: Instruction): void {
        this.cpu.v[instruction.x] ^= this.cpu.v[instruction.y];
    }

    executeAddReg(instruction: Instruction): void {
        const sum = this.cpu.v[instruction.x] + this.cpu.v[instruction.y];
        this.cpu.v[0xF] = sum > 0xFF ? 1 : 0;
        this.cpu.v[instruction.x] = sum & 0xFF;
    }

    executeSub(instruction: Instruction): void {
        this.cpu.v[0xF] = this.cpu.v[instruction.x] > this.cpu.v[instruction.y] ? 1 : 0;
        this.cpu.v[instruction.x] = (this.cpu.v[instruction.x] - this.cpu.v[instruction.y]) & 0xFF;
    }

    executeShiftRight(instruction: Instruction): void {
        this.cpu.v[0xF] = this.cpu.v[instruction.x] & 0x1;
        this.cpu.v[instruction.x] >>= 1;
    }

    executeSubReverse(instruction: Instruction): void {
        this.cpu.v[0xF] = this.cpu.v[instruction.y] > this.cpu.v[instruction.x] ? 1 : 0;
        this.cpu.v[instruction.x] = (this.cpu.v[instruction.y] - this.cpu.v[instruction.x]) & 0xFF;
    }

    executeShiftLeft(instruction: Instruction): void {
        this.cpu.v[0xF] = (this.cpu.v[instruction.x] >> 7) & 0x1;
        this.cpu.v[instruction.x] = (this.cpu.v[instruction.x] << 1) & 0xFF;
    }

    executeSkipRegNotEqual(instruction: Instruction): void {
        if (this.cpu.v[instruction.x] !== this.cpu.v[instruction.y]) {
            this.cpu.pc += 2;
        }
    }

    executeLoadIndex(instruction: Instruction): void {
        this.cpu.i = instruction.nnn;
    }

    executeJumpOffset(instruction: Instruction): void {
        this.cpu.pc = instruction.nnn + this.cpu.v[0];
    }

    executeRandom(instruction: Instruction): void {
        this.cpu.v[instruction.x] = this.random.next() & instruction.nn;
    }

    executeDraw(instruction: Instruction): void {
        const x = this.cpu.v[instruction.x] % this.display.width;
        const y = this.cpu.v[instruction.y] % this.display.height;
        const height = instruction.n;
        
        this.cpu.v[0xF] = 0;
        
        for (let row = 0; row < height; row++) {
            const spriteByte = this.memory.read(this.cpu.i + row);
            
            for (let col = 0; col < 8; col++) {
                if ((spriteByte & (0x80 >> col)) !== 0) {
                    const pixelX = this.wrapCoordinate(x + col, this.display.width);
                    const pixelY = this.wrapCoordinate(y + row, this.display.height);
                    
                    if (this.checkCollision(pixelX, pixelY, 1)) {
                        this.cpu.v[0xF] = 1;
                    }
                    
                    this.display.xorPixel(pixelX, pixelY);
                }
            }
        }
    }

    executeSkipKey(instruction: Instruction): void {
        if (this.keypad.isPressed(this.cpu.v[instruction.x])) {
            this.cpu.pc += 2;
        }
    }

    executeSkipNotKey(instruction: Instruction): void {
        if (!this.keypad.isPressed(this.cpu.v[instruction.x])) {
            this.cpu.pc += 2;
        }
    }

    executeGetDelay(instruction: Instruction): void {
        this.cpu.v[instruction.x] = this.cpu.delay;
    }

    executeWaitKey(instruction: Instruction): void {
        const key = this.keypad.waitForKey();
        this.cpu.v[instruction.x] = key;
    }

    executeSetDelay(instruction: Instruction): void {
        this.cpu.delay = this.cpu.v[instruction.x];
    }

    executeSetSound(instruction: Instruction): void {
        this.cpu.sound = this.cpu.v[instruction.x];
    }

    executeAddIndex(instruction: Instruction): void {
        const sum = this.cpu.i + this.cpu.v[instruction.x];
        this.cpu.v[0xF] = sum > 0xFFF ? 1 : 0;
        this.cpu.i = sum & 0xFFF;
    }

    executeFontChar(instruction: Instruction): void {
        this.cpu.i = this.cpu.v[instruction.x] * 5;
    }

    executeBCD(instruction: Instruction): void {
        const value = this.cpu.v[instruction.x];
        this.memory.write(this.cpu.i, Math.floor(value / 100));
        this.memory.write(this.cpu.i + 1, Math.floor((value % 100) / 10));
        this.memory.write(this.cpu.i + 2, value % 10);
    }

    executeStore(instruction: Instruction): void {
        for (let i = 0; i <= instruction.x; i++) {
            this.memory.write(this.cpu.i + i, this.cpu.v[i]);
        }
    }

    executeLoadMem(instruction: Instruction): void {
        for (let i = 0; i <= instruction.x; i++) {
            this.cpu.v[i] = this.memory.read(this.cpu.i + i);
        }
    }

    checkCollision(x: number, y: number, height: number): boolean {
        return this.display.getPixel(x, y);
    }

    wrapCoordinate(coord: number, max: number): number {
        return coord % max;
    }
}
