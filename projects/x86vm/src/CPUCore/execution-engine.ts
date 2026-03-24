import { ALU } from './alu';
import { FPU } from './fpu';
import { EFlagsRegister } from '../Registers';
import { Registers } from './registers';
import { MemoryManager } from '../MemoryManager';
import { Instruction } from '../InstructionDecoder';
import { Operand } from '../InstructionDecoder';
import { MicroOp } from './micro-op';
import { ArithmeticOp } from './arithmetic-op';
import { LogicOp } from './logic-op';
import { BitwiseOp } from './bitwise-op';
import { ShiftOp } from './shift-op';
import { CompareOp } from './compare-op';
import { TestOp } from './test-op';
import { JumpOp } from './jump-op';
import { CallOp } from './call-op';
import { ReturnOp } from './return-op';
import { MoveOp } from './move-op';
import { PushOp } from './push-op';
import { PopOp } from './pop-op';
import { StringOp } from './string-op';
import { OperandSize } from '../InstructionDecoder';
import { FlagType } from './flag-type';
import { ConditionCode } from './condition-code';

export class ExecutionEngine {
    private alu: ALU;
    private fpu: FPU;
    private flags: EFlagsRegister;
    private registers: Registers;
    private memoryManager: MemoryManager;
    private currentInstruction: Instruction;
    private operandStack: Operand[];

    constructor(alu: ALU, fpu: FPU, flags: EFlagsRegister, registers: Registers, memoryManager: MemoryManager) {
        this.alu = alu;
        this.fpu = fpu;
        this.flags = flags;
        this.registers = registers;
        this.memoryManager = memoryManager;
        this.currentInstruction = {} as Instruction;
        this.operandStack = [];
    }

    execute(instruction: Instruction): void {
        this.currentInstruction = instruction;
        
        if (instruction.microOps && instruction.microOps.length > 0) {
            for (const microOp of instruction.microOps) {
                this.executeMicroOp(microOp);
            }
        } else {
            switch (instruction.type) {
                case 'arithmetic':
                    this.executeArithmetic(instruction as ArithmeticOp);
                    break;
                case 'logic':
                    this.executeLogic(instruction as LogicOp);
                    break;
                case 'bitwise':
                    this.executeBitwise(instruction as BitwiseOp);
                    break;
                case 'shift':
                    this.executeShift(instruction as ShiftOp);
                    break;
                case 'compare':
                    this.executeCompare(instruction as CompareOp);
                    break;
                case 'test':
                    this.executeTest(instruction as TestOp);
                    break;
                case 'jump':
                    this.executeJump(instruction as JumpOp);
                    break;
                case 'call':
                    this.executeCall(instruction as CallOp);
                    break;
                case 'return':
                    this.executeReturn(instruction as ReturnOp);
                    break;
                case 'move':
                    this.executeMove(instruction as MoveOp);
                    break;
                case 'push':
                    this.executePush(instruction as PushOp);
                    break;
                case 'pop':
                    this.executePop(instruction as PopOp);
                    break;
                case 'string':
                    this.executeString(instruction as StringOp);
                    break;
                default:
                    throw new Error(`Unknown instruction type: ${instruction.type}`);
            }
        }
    }

    executeMicroOp(microOp: MicroOp): void {
        switch (microOp.type) {
            case 'arithmetic':
                this.executeArithmetic(microOp as ArithmeticOp);
                break;
            case 'logic':
                this.executeLogic(microOp as LogicOp);
                break;
            case 'bitwise':
                this.executeBitwise(microOp as BitwiseOp);
                break;
            case 'shift':
                this.executeShift(microOp as ShiftOp);
                break;
            case 'compare':
                this.executeCompare(microOp as CompareOp);
                break;
            case 'test':
                this.executeTest(microOp as TestOp);
                break;
            case 'jump':
                this.executeJump(microOp as JumpOp);
                break;
            case 'call':
                this.executeCall(microOp as CallOp);
                break;
            case 'return':
                this.executeReturn(microOp as ReturnOp);
                break;
            case 'move':
                this.executeMove(microOp as MoveOp);
                break;
            case 'push':
                this.executePush(microOp as PushOp);
                break;
            case 'pop':
                this.executePop(microOp as PopOp);
                break;
            case 'string':
                this.executeString(microOp as StringOp);
                break;
            default:
                throw new Error(`Unknown micro-op type: ${microOp.type}`);
        }
    }

    executeArithmetic(op: ArithmeticOp): void {
        const dest = this.getOperandValue(op.destination);
        const src = op.source ? this.getOperandValue(op.source) : 0;
        let result: number = 0;

        switch (op.operation) {
            case 'add':
                result = this.alu.add(dest, src);
                break;
            case 'sub':
                result = this.alu.sub(dest, src);
                break;
            case 'mul':
                result = this.handleMultiplication(dest, src, op.size);
                break;
            case 'div':
                result = this.handleDivision(dest, src, op.size);
                break;
            case 'inc':
                result = this.alu.inc(dest);
                break;
            case 'dec':
                result = this.alu.dec(dest);
                break;
            case 'neg':
                result = this.alu.neg(dest);
                break;
            case 'adc':
                result = this.alu.adc(dest, src, this.flags.getCarry());
                break;
            case 'sbb':
                result = this.alu.sbb(dest, src, this.flags.getCarry());
                break;
            default:
                throw new Error(`Unknown arithmetic operation: ${op.operation}`);
        }

        this.setOperandValue(op.destination, result);
        this.updateFlags(result, op.size, 'arithmetic');
    }

    executeLogic(op: LogicOp): void {
        const dest = this.getOperandValue(op.destination);
        const src = this.getOperandValue(op.source);
        let result: number = 0;

        switch (op.operation) {
            case 'and':
                result = this.alu.and(dest, src);
                break;
            case 'or':
                result = this.alu.or(dest, src);
                break;
            case 'xor':
                result = this.alu.xor(dest, src);
                break;
            case 'not':
                result = this.alu.not(dest);
                break;
            default:
                throw new Error(`Unknown logic operation: ${op.operation}`);
        }

        this.setOperandValue(op.destination, result);
        this.updateFlags(result, op.size, 'logic');
    }

    executeBitwise(op: BitwiseOp): void {
        const dest = this.getOperandValue(op.destination);
        const src = this.getOperandValue(op.source);
        let result: number = 0;

        switch (op.operation) {
            case 'bts':
                result = this.alu.bts(dest, src);
                break;
            case 'btr':
                result = this.alu.btr(dest, src);
                break;
            case 'btc':
                result = this.alu.btc(dest, src);
                break;
            case 'bsf':
                result = this.alu.bsf(dest, src);
                break;
            case 'bsr':
                result = this.alu.bsr(dest, src);
                break;
            default:
                throw new Error(`Unknown bitwise operation: ${op.operation}`);
        }

        this.setOperandValue(op.destination, result);
        this.updateFlags(result, op.size, 'bitwise');
    }

    executeShift(op: ShiftOp): void {
        const dest = this.getOperandValue(op.destination);
        const count = op.count ? this.getOperandValue(op.count) : 1;
        let result: number = 0;

        switch (op.operation) {
            case 'shl':
            case 'sal':
                result = this.alu.shl(dest, count);
                break;
            case 'shr':
                result = this.alu.shr(dest, count);
                break;
            case 'sar':
                result = this.alu.sar(dest, count);
                break;
            case 'rol':
                result = this.alu.rol(dest, count);
                break;
            case 'ror':
                result = this.alu.ror(dest, count);
                break;
            case 'rcl':
                result = this.alu.rcl(dest, count, this.flags.getCarry());
                break;
            case 'rcr':
                result = this.alu.rcr(dest, count, this.flags.getCarry());
                break;
            default:
                throw new Error(`Unknown shift operation: ${op.operation}`);
        }

        this.setOperandValue(op.destination, result);
        this.updateFlags(result, op.size, 'shift');
    }

    executeCompare(op: CompareOp): void {
        const dest = this.getOperandValue(op.destination);
        const src = this.getOperandValue(op.source);
        const result = this.alu.sub(dest, src);
        
        this.updateFlags(result, op.size, 'compare');
        this.flags.setZero(dest === src);
        this.flags.setSign((result & (1 << (op.size * 8 - 1))) !== 0);
    }

    executeTest(op: TestOp): void {
        const dest = this.getOperandValue(op.destination);
        const src = this.getOperandValue(op.source);
        const result = this.alu.and(dest, src);
        
        this.updateFlags(result, op.size, 'test');
        this.flags.setZero(result === 0);
        this.flags.setSign((result & (1 << (op.size * 8 - 1))) !== 0);
    }

    executeJump(op: JumpOp): void {
        if (this.checkJumpCondition(op.condition)) {
            const target = this.calculateEffectiveAddress(op.target);
            this.registers.setInstructionPointer(target);
        }
    }

    executeCall(op: CallOp): void {
        const returnAddress = this.registers.getInstructionPointer() + op.instructionLength;
        
        const sp = this.registers.getStackPointer();
        this.memoryManager.write(sp - 4, returnAddress, 4);
        this.registers.setStackPointer(sp - 4);
        
        const target = this.calculateEffectiveAddress(op.target);
        this.registers.setInstructionPointer(target);
    }

    executeReturn(op: ReturnOp): void {
        const sp = this.registers.getStackPointer();
        const returnAddress = this.memoryManager.read(sp, 4);
        
        this.registers.setStackPointer(sp + 4 + (op.bytesToPop || 0));
        this.registers.setInstructionPointer(returnAddress);
    }

    executeMove(op: MoveOp): void {
        const value = op.source ? this.getOperandValue(op.source) : op.immediate!;
        this.setOperandValue(op.destination, value);
    }

    executePush(op: PushOp): void {
        const value = op.source ? this.getOperandValue(op.source) : op.immediate!;
        const sp = this.registers.getStackPointer();
        
        this.memoryManager.write(sp - op.size, value, op.size);
        this.registers.setStackPointer(sp - op.size);
    }

    executePop(op: PopOp): void {
        const sp = this.registers.getStackPointer();
        const value = this.memoryManager.read(sp, op.size);
        
        this.setOperandValue(op.destination, value);
        this.registers.setStackPointer(sp + op.size);
    }

    executeString(op: StringOp): void {
        const direction = this.flags.getDirection() ? -1 : 1;
        
        switch (op.operation) {
            case 'movs':
                const srcValue = this.memoryManager.read(this.registers.getSourceIndex(), op.size);
                this.memoryManager.write(this.registers.getDestinationIndex(), srcValue, op.size);
                break;
            case 'stos':
                this.memoryManager.write(this.registers.getDestinationIndex(), this.registers.getAccumulator(), op.size);
                break;
            case 'lods':
                const value = this.memoryManager.read(this.registers.getSourceIndex(), op.size);
                this.registers.setAccumulator(value);
                break;
            case 'scas':
                const cmpValue = this.memoryManager.read(this.registers.getDestinationIndex(), op.size);
                const accValue = this.registers.getAccumulator();
                const result = this.alu.sub(accValue, cmpValue);
                this.updateFlags(result, op.size, 'compare');
                break;
            case 'cmps':
                const srcByte = this.memoryManager.read(this.registers.getSourceIndex(), op.size);
                const destByte = this.memoryManager.read(this.registers.getDestinationIndex(), op.size);
                const cmpResult = this.alu.sub(srcByte, destByte);
                this.updateFlags(cmpResult, op.size, 'compare');
                break;
            default:
                throw new Error(`Unknown string operation: ${op.operation}`);
        }
        
        if (op.repeat) {
            const count = this.registers.getCount();
            if (count > 0) {
                this.registers.setCount(count - 1);
                this.registers.setSourceIndex(this.registers.getSourceIndex() + direction * op.size);
                this.registers.setDestinationIndex(this.registers.getDestinationIndex() + direction * op.size);
                
                if (count - 1 > 0) {
                    this.registers.setInstructionPointer(this.registers.getInstructionPointer() - op.instructionLength);
                }
            }
        } else {
            this.registers.setSourceIndex(this.registers.getSourceIndex() + direction * op.size);
            this.registers.setDestinationIndex(this.registers.getDestinationIndex() + direction * op.size);
        }
    }

    calculateEffectiveAddress(operand: Operand): number {
        if (operand.type === 'register') {
            return this.registers.getRegisterValue(operand.value);
        } else if (operand.type === 'memory') {
            let address = 0;
            
            if (operand.base) {
                address += this.registers.getRegisterValue(operand.base);
            }
            
            if (operand.index) {
                address += this.registers.getRegisterValue(operand.index) * (operand.scale || 1);
            }
            
            if (operand.displacement) {
                address += operand.displacement;
            }
            
            if (operand.segment) {
                const segmentBase = this.registers.getSegmentBase(operand.segment);
                address += segmentBase;
            }
            
            return address;
        } else if (operand.type === 'immediate') {
            return operand.value;
        }
        
        throw new Error(`Invalid operand type for address calculation: ${operand.type}`);
    }

    updateFlags(result: number, size: OperandSize, type: FlagType): void {
        const mask = (1 << (size * 8)) - 1;
        const truncatedResult = result & mask;
        
        switch (type) {
            case 'arithmetic':
                this.flags.setCarry(result > mask);
                this.flags.setOverflow(((result >> (size * 8 - 1)) & 1) !== ((result >> (size * 8 - 2)) & 1));
                break;
            case 'logic':
            case 'bitwise':
                this.flags.setCarry(false);
                this.flags.setOverflow(false);
                break;
            case 'shift':
                break;
            case 'compare':
            case 'test':
                break;
        }
        
        this.flags.setZero(truncatedResult === 0);
        this.flags.setSign((truncatedResult & (1 << (size * 8 - 1))) !== 0);
        this.flags.setParity(this.calculateParity(truncatedResult));
        this.flags.setAdjust(((result >> 4) & 1) !== ((result >> 3) & 1));
    }

    checkJumpCondition(condition: ConditionCode): boolean {
        switch (condition) {
            case 'o': return this.flags.getOverflow();
            case 'no': return !this.flags.getOverflow();
            case 'b': case 'c': case 'nae': return this.flags.getCarry();
            case 'nb': case 'nc': case 'ae': return !this.flags.getCarry();
            case 'z': case 'e': return this.flags.getZero();
            case 'nz': case 'ne': return !this.flags.getZero();
            case 'be': case 'na': return this.flags.getCarry() || this.flags.getZero();
            case 'nbe': case 'a': return !this.flags.getCarry() && !this.flags.getZero();
            case 's': return this.flags.getSign();
            case 'ns': return !this.flags.getSign();
            case 'p': case 'pe': return this.flags.getParity();
            case 'np': case 'po': return !this.flags.getParity();
            case 'l': case 'nge': return this.flags.getSign() !== this.flags.getOverflow();
            case 'nl': case 'ge': return this.flags.getSign() === this.flags.getOverflow();
            case 'le': case 'ng': return this.flags.getZero() || (this.flags.getSign() !== this.flags.getOverflow());
            case 'nle': case 'g': return !this.flags.getZero() && (this.flags.getSign() === this.flags.getOverflow());
            default:
                throw new Error(`Unknown condition code: ${condition}`);
        }
    }

    handleDivision(dividend: number, divisor: number, size: OperandSize): number {
        if (divisor === 0) {
            throw new Error('Division by zero');
        }
        
        const mask = (1 << (size * 8)) - 1;
        const quotient = Math.floor(dividend / divisor);
        
        if (quotient > mask) {
            throw new Error('Division overflow');
        }
        
        return quotient;
    }

    handleMultiplication(multiplicand: number, multiplier: number, size: OperandSize): number {
        const result = multiplicand * multiplier;
        const mask = (1 << (size * 8 * 2)) - 1;
        return result & mask;
    }

    private getOperandValue(operand: Operand): number {
        if (operand.type === 'register') {
            return this.registers.getRegisterValue(operand.value);
        } else if (operand.type === 'memory') {
            const address = this.calculateEffectiveAddress(operand);
            return this.memoryManager.read(address, operand.size || 4);
        } else if (operand.type === 'immediate') {
            return operand.value;
        }
        
        throw new Error(`Invalid operand type: ${operand.type}`);
    }

    private setOperandValue(operand: Operand, value: number): void {
        if (operand.type === 'register') {
            this.registers.setRegisterValue(operand.value, value);
        } else if (operand.type === 'memory') {
            const address = this.calculateEffectiveAddress(operand);
            this.memoryManager.write(address, value, operand.size || 4);
        } else {
            throw new Error(`Cannot set value for operand type: ${operand.type}`);
        }
    }

    private calculateParity(value: number): boolean {
        let count = 0;
        for (let i = 0; i < 8; i++) {
            if (value & (1 << i)) count++;
        }
        return count % 2 === 0;
    }
}
