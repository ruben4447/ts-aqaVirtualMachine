import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { INumberType, NumberType } from "../../types/general";
import CPU from "./CPU";
import { instructionSet } from '../../instruction-set/rs';
import { CMP, compare, createRegister } from "../../utils/CPU";
import { getNumTypeInfo, numericTypeToObject, numberTypeMap, numberToString } from "../../utils/general";

const hex = (n: number, t: NumberType) => numberToString(numericTypeToObject[t], n, 16);

function createRegisterMap() {
    const R = createRegister;
    let roff = 0;
    const registerMap = {
        rax: R(0 + 0, "int64", false), eax: R(0 + 4, "int32", false), ax: R(0 + 6, "int16", false), al: R(0 + 7, "int8", false), // ACCUMULATOR
        rbx: R(8 + 0, "int64", true), ebx: R(8 + 4, "int32", true), bx: R(8 + 6, "int16", true), bl: R(8 + 7, "int8", true),
        rcx: R(16 + 0, "int64", false), ecx: R(16 + 4, "int32", false), cx: R(16 + 6, "int16", false), cl: R(16 + 7, "int8", false),
        rdx: R(24 + 0, "int64", false), edx: R(24 + 4, "int32", false), dx: R(24 + 6, "int16", false), dl: R(24 + 7, "int8", false),
        rsp: R(32 + 0, "int64", true), esx: R(32 + 4, "int32", true), sp: R(32 + 6, "int16", true), spl: R(32 + 7, "int8", true), // STACK POINTER
        rbp: R(40 + 0, "int64", true), ebp: R(40 + 4, "int32", true), bp: R(40 + 6, "int16", true), bpl: R(40 + 7, "int8", true), // FRAME (BASE) POINTER
        rsi: R(48 + 0, "int64", false), esi: R(48 + 4, "int32", false), si: R(48 + 6, "int16", false), sil: R(48 + 7, "int8", false),
        rdi: R(56 + 0, "int64", false), edi: R(56 + 4, "int32", false), di: R(56 + 6, "int16", false), dil: R(56 + 7, "int8", false),
        r8: R(64 + 0, "int64", false), r8d: R(64 + 4, "int32", false), r8w: R(64 + 6, "int16", false), r8b: R(64 + 7, "int8", false),
        r9: R(72 + 0, "int64", false), r9d: R(72 + 4, "int32", false), r9w: R(72 + 6, "int16", false), r9b: R(72 + 7, "int8", false),
        r10: R(80 + 0, "int64", false), r10d: R(80 + 4, "int32", false), r10w: R(80 + 6, "int16", false), r10b: R(80 + 7, "int8", false),
        r11: R(88 + 0, "int64", false), r11d: R(88 + 4, "int32", false), r11w: R(88 + 6, "int16", false), r11b: R(88 + 7, "int8", false),
        r12: R(96 + 0, "int64", true), r12d: R(96 + 4, "int32", true), r12w: R(96 + 6, "int16", true), r12b: R(96 + 7, "int8", true),
        r13: R(104 + 0, "int64", true), r13d: R(104 + 4, "int32", true), r13w: R(104 + 6, "int16", true), r13b: R(104 + 7, "int8", true),
        r14: R(112 + 0, "int64", true), r14d: R(112 + 4, "int32", true), r14w: R(112 + 6, "int16", true), r14b: R(112 + 7, "int8", true),
        r15: R(120 + 0, "int64", true), r15d: R(120 + 4, "int32", true), r15w: R(120 + 6, "int16", true), r15b: R(120 + 7, "int8", true),
        rip: R(128 + 0, "int64", true), eip: R(128 + 4, "int32", true), ip: R(128 + 6, "int16", true), // Instruction pointer
        rflags: R(136 + 0, "int64", false), eflags: R(136 + 4, "int32", false), flags: R(136 + 6, "int16", false), // Contains flags
    }
    roff = 144;
    for (let i = 0; i <= 31; i++, roff += 8)
        registerMap['xmm' + i] = R(roff, "float64", false);
    for (let i = 0; i <= 7; i++, roff += 8)
        registerMap['mm' + i] = R(roff, "float64", false);
    return registerMap;
}

export class RSProcessor extends CPU {
    public static readonly defaultNumType: NumberType = 'float32';
    public readonly model: CPUModel = CPUModel.RS;
    public readonly regIAcc: string = 'rax'; // Integer Accumulator
    public readonly regFAcc: string = 'xmm0'; // Float Accumulator


    public constructor(config: ICPUConfiguration) {
        config.registerMap = createRegisterMap();
        super(instructionSet, config, RSProcessor.defaultNumType);

        this.regInstructionPtr = "rip";
        this.regStackPtr = "rsp";
        this.regFramePtr = "rbp";
        this.instructType = numericTypeToObject["uint8"];
        this.regType = numericTypeToObject["uint16"];
        this.addrType = numericTypeToObject["uint32"];
        this.instructTypeSuffixes = true;

        this.resetRegisters();
    }

    /** Fetch from memory given data type */
    fetchType(dt: NumberType) {
        return super.fetch(numericTypeToObject[dt]);
    }

    /** Fetch byte indicating data type */
    fetchDT() { return this.fetch(numericTypeToObject["uint8"]); }

    /** Fetch register from memory */
    fetchReg() { return this.fetch(this.regType); }

    /** Fetch address from memory */
    fetchAddr() { return this.fetch(this.addrType); }

    /** Get next byte indicating a DATA TYPE from memory */
    getDataType() {
        const n = this.fetch(numericTypeToObject["uint8"]);
        const str: NumberType = numberTypeMap[n];
        if (str == undefined) throw new Error(`SIGILL - unknown data type flag ${n}`);
        return { type: n, typeStr: str }
    }

    /** @override */
    public execute(opcode: number, info: IExecuteRecord): boolean {
        let continueExec = true, comment = this.executionConfig.commentary;
        info.type = numberTypeMap[this.numType.type];

        switch (opcode) {
            case this.instructionSet.NOP:
                // NOP
                if (comment) info.text = this.executionConfig.haltOnNull ? 'NOP: halted programme execution' : 'Skip NOP instruction';
                continueExec = !this.executionConfig.haltOnNull;
                break;
            case this.instructionSet.HALT:
                // HALT
                if (comment) info.text = `Halt execution`;
                continueExec = false;
                break;
            case this.instructionSet.MOV_REG_REG: {
                // MOV register1 register2
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [register1, register2];
                const register2value = this.readRegister(register2);
                if (comment) info.text = `Copy value in register ${this._registerOffsets[register2]} (${register2value}) to register ${this._registerOffsets[register1]}`;
                this.writeRegister(register1, register2value);
                break;
            }
            case this.instructionSet.MOV_CONST_REG: {
                // MOV register constant
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg(), constant = this.fetchType(typeStr);
                info.type = type;
                info.args = [register, constant];
                if (comment) info.text = `Move #${constant} to register ${this._registerOffsets[register]}`;
                this.writeRegister(register, constant);
                break;
            }
            case this.instructionSet.MOV_ADDR_REG: {
                // MOV register address
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg(), address = this.fetchAddr();
                info.type = type;
                info.args = [register, address];
                const value = this.readMemory(address, numericTypeToObject[typeStr]);
                if (comment) info.text = `Copy value at address 0x${hex(address, this.addrType.type)} (0x${hex(value, typeStr)}) to register ${this._registerOffsets[register]}`;
                this.writeRegister(register, value);
                break;
            }
            case this.instructionSet.MOV_REG_ADDR: {
                // MOV address register
                const address = this.fetchAddr(), register = this.fetchReg();
                info.args = [address, register];
                const value = this.readRegister(register), registerType = this.registerMap[this._registerOffsets[register]].type;
                if (comment)
                    info.text = `Copy value in register ${this._registerOffsets[register]} (${value}) to address 0x${hex(address, this.addrType.type)}`;
                this.writeMemory(address, value, numericTypeToObject[registerType]);
                break;
            }
            case this.instructionSet.MOV_REGPTR_REG: {
                // MOV registerPtr register
                const registerPtr = this.fetchReg(), register = this.fetchReg();
                info.args = [registerPtr, register];
                const address = this.readRegister(registerPtr);
                const registerValue = this.readRegister(register), regType = this.registerMap[this._registerOffsets[register]].type;
                if (comment) info.text = `Copy value in register ${this._registerOffsets[register]} (#${registerValue}) to address in register ${this._registerOffsets[registerPtr]} (0x${hex(address, this.addrType.type)})`;
                this.writeMemory(address, registerValue, numericTypeToObject[regType]);
                break;
            }
            case this.instructionSet.MOV_REG_REGPTR: {
                // MOV register registerPtr
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg(), registerPtr = this.fetchReg();
                info.args = [register, registerPtr];
                info.type = type;
                const address = this.readRegister(registerPtr), value = this.readMemory(address, numericTypeToObject[typeStr]);
                if (comment) info.text = `Copy value stored at address in register ${this._registerOffsets[register]} (0x${hex(address, this.addrType.type)} : 0x${hex(value, typeStr)}) to register ${this._registerOffsets[registerPtr]}`;
                this.writeRegister(register, value);
                break;
            }
            case this.instructionSet.ADD_REG_REG: {
                // ADD register1 register2
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const register2 = this.fetchReg(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 + value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} + register ${this._registerOffsets[register2]}\n${value1} + ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.ADD_REG_CONST: {
                // ADD register constant
                const { type, typeStr } = this.getDataType();
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const value2 = this.fetchType(typeStr);
                info.type = type;
                info.args = [register1, value2];
                const result = value1 + value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} + ${typeStr} constant\n${value1} + ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.SUB_REG_REG: {
                // SUB register1 register2
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const register2 = this.fetchReg(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 - value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} - register ${this._registerOffsets[register2]}\n${value1} - ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.SUB_REG_CONST: {
                // SUB register constant
                const { type, typeStr } = this.getDataType();
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const value2 = this.fetchType(typeStr);
                info.type = type;
                info.args = [register1, value2];
                const result = value1 - value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} - ${typeStr} constant\n${value1} - ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.MUL_REG_REG: {
                // MUL register1 register2
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const register2 = this.fetchReg(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 * value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} * register ${this._registerOffsets[register2]}\n${value1} * ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.MUL_REG_CONST: {
                // MUL register constant
                const { type, typeStr } = this.getDataType();
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const value2 = this.fetchType(typeStr);
                info.type = type;
                info.args = [register1, value2];
                const result = value1 * value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} * ${typeStr} constant\n${value1} * ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.DIV_REG_REG: {
                // DIV register1 register2
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const register2 = this.fetchReg(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 / value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} / register ${this._registerOffsets[register2]}\n${value1} / ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.DIV_REG_CONST: {
                // DIV register constant
                const { type, typeStr } = this.getDataType();
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const value2 = this.fetchType(typeStr);
                info.type = type;
                info.args = [register1, value2];
                const result = value1 / value2;
                if (comment) info.text = `Register ${this._registerOffsets[register1]} / ${typeStr} constant\n${value1} / ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.IDIV_REG_REG: {
                // IDIV register1 register2
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const register2 = this.fetchReg(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = Math.floor(value1 / value2);
                if (comment) info.text = `floor(register ${this._registerOffsets[register1]} / register ${this._registerOffsets[register2]})\nfloor(${value1} / ${value2}) = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.IDIV_REG_CONST: {
                // IDIV register constant
                const { type, typeStr } = this.getDataType();
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const value2 = this.fetchType(typeStr);
                info.type = type;
                info.args = [register1, value2];
                const result = Math.floor(value1 / value2);
                if (comment) info.text = `floor(register ${this._registerOffsets[register1]} / ${typeStr} constant)\nfloor(${value1} / ${value2}) = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.POW_REG_REG: {
                // POW register1 register2
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const register2 = this.fetchReg(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = Math.pow(value1, value2);
                if (comment) info.text = `Register ${this._registerOffsets[register1]} ** register ${this._registerOffsets[register2]}\n${value1} ** ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.POW_REG_CONST: {
                // POW register constant
                const { type, typeStr } = this.getDataType();
                const register1 = this.fetchReg(), value1 = this.readRegister(register1);
                const value2 = this.fetchType(typeStr);
                info.type = type;
                info.args = [register1, value2];
                const result = Math.pow(value1, value2);
                if (comment) info.text = `Register ${this._registerOffsets[register1]} ** ${typeStr} constant\n${value1} ** ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                this.writeRegister(this.regFAcc, result);
                break;
            }
            case this.instructionSet.SQRT_REG: {
                // SQRT register
                const register = this.fetchReg(), typeobj = numericTypeToObject[this.registerMap[this._registerOffsets[register]].type];
                let value = this.readRegister(register), result = Math.sqrt(value);
                if (typeobj.isInt) result = Math.floor(result);
                if (comment) info.text = `${typeobj.isInt ? 'Integer' : 'Float'} square root of register ${this._registerOffsets[register]}\nsqrt(${value}) = ${result}`;
                this.writeRegister(typeobj.isInt ? this.regIAcc : this.regFAcc, result);
                break;
            }
            case this.instructionSet.SQRT_CONST: {
                // SQRT constant
                const { type, typeStr } = this.getDataType();
                const typeobj = numericTypeToObject[typeStr];
                let value = this.fetch(typeobj), result = Math.sqrt(value);
                if (typeobj.isInt) result = Math.floor(result);
                if (comment) info.text = `${typeobj.isInt ? 'Integer' : 'Float'} square root of ${typeobj.type} constant\nsqrt(${value}) = ${result}`;
                this.writeRegister(typeobj.isInt ? this.regIAcc : this.regFAcc, result);
                break;
            }
            case this.instructionSet.INC: {
                // INC register
                const register = this.fetchReg(), value = this.readRegister(register), result = value + 1;
                if (comment) info.text = `Increment register ${this._registerOffsets[register]}\n${value} + 1 = ${result}`;
                this.writeRegister(register, result);
                break;
            }
            case this.instructionSet.DEC: {
                // DEC register
                const register = this.fetchReg(), value = this.readRegister(register), result = value - 1;
                if (comment) info.text = `Decrement register ${this._registerOffsets[register]}\n${value} - 1 = ${result}`;
                this.writeRegister(register, result);
                break;
            }
            case this.instructionSet.AND_REG_REG: {
                // AND register1 register2
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = Number(BigInt(value1) & BigInt(value2));
                if (comment) info.text = `Register ${this._registerOffsets[register1]} & register ${this._registerOffsets[register2]}\n${value1} & ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.AND_REG_CONST: {
                // AND register constant
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg();
                info.type = type;
                const value1 = this.readRegister(register), value2 = this.fetchType(typeStr);
                info.args = [register, value2];
                const result = Number(BigInt(value1) & BigInt(value2));
                if (comment) info.text = `Register ${this._registerOffsets[register]} & ${typeStr} constant\n${value1} & ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.OR_REG_REG: {
                // OR register1 register2
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = Number(BigInt(value1) | BigInt(value2));
                if (comment) info.text = `Register ${this._registerOffsets[register1]} | register ${this._registerOffsets[register2]}\n${value1} | ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.OR_REG_CONST: {
                // OR register constant
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg();
                info.type = type;
                const value1 = this.readRegister(register), value2 = this.fetchType(typeStr);
                info.args = [register, value2];
                const result = Number(BigInt(value1) | BigInt(value2));
                if (comment) info.text = `Register ${this._registerOffsets[register]} | ${typeStr} constant\n${value1} | ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.XOR_REG_REG: {
                // XOR register1 register2
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = Number(BigInt(value1) ^ BigInt(value2));
                if (comment) info.text = `Register ${this._registerOffsets[register1]} ^ register ${this._registerOffsets[register2]}\n${value1} ^ ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.XOR_REG_CONST: {
                // XOR register constant
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg();
                info.type = type;
                const value1 = this.readRegister(register), value2 = this.fetchType(typeStr);
                info.args = [register, value2];
                const result = Number(BigInt(value1) ^ BigInt(value2));
                if (comment) info.text = `Register ${this._registerOffsets[register]} ^ ${typeStr} constant\n${value1} ^ ${value2} = ${result}`;
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.NOT: {
                // NOT register
                const register = this.fetchReg();
                info.args = [register];
                const regValue = this.readRegister(register);
                const result = Number(~BigInt(regValue));
                if (comment) {
                    const type = this.registerMap[this.regIAcc].type;
                    info.text = `NOT register ${this._registerOffsets[register]}\n~0x${hex(regValue, type)} = 0x${hex(result, type)}`;
                }
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.SHL_REG_REG: {
                // SHL register1 register2
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = Number(BigInt(value1) << BigInt(value2));
                if (comment) {
                    const t1 = this.registerMap[this._registerOffsets[register1]].type, t2 = this.registerMap[this._registerOffsets[register2]].type;
                    info.text = `Left shift register ${this._registerOffsets[register1]} by register ${this._registerOffsets[register2]}\n0x${hex(value1, t1)} << 0x${hex(value2, t2)} = 0x${hex(result, t1)}`;
                }
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.SHL_REG_CONST: {
                // SHL register constant
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg();
                info.type = type;
                const value1 = this.readRegister(register), value2 = this.fetchType(typeStr);
                info.args = [register, value2];
                const result = Number(BigInt(value1) << BigInt(value2));
                if (comment) {
                    const t1 = this.registerMap[this._registerOffsets[register]].type;
                    info.text = `Left shift register ${this._registerOffsets[register]} by ${typeStr} constant\n0x${hex(value1, t1)} << 0x${hex(value2, typeStr)} = 0x${hex(result, t1)}`;
                }
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.SHR_REG_REG: {
                // SHR register1 register2
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = Number(BigInt(value1) >> BigInt(value2));
                if (comment) {
                    const t1 = this.registerMap[this._registerOffsets[register1]].type, t2 = this.registerMap[this._registerOffsets[register2]].type;
                    info.text = `Right shift register ${this._registerOffsets[register1]} by register ${this._registerOffsets[register2]}\n0x${hex(value1, t1)} << 0x${hex(value2, t2)} = 0x${hex(result, t1)}`;
                }
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.SHR_REG_CONST: {
                // SHR register constant
                const { type, typeStr } = this.getDataType();
                const register = this.fetchReg();
                info.type = type;
                const value1 = this.readRegister(register), value2 = this.fetchType(typeStr);
                info.args = [register, value2];
                const result = Number(BigInt(value1) >> BigInt(value2));
                if (comment) {
                    const t1 = this.registerMap[this._registerOffsets[register]].type;
                    info.text = `Rigth shift register ${this._registerOffsets[register]} by ${typeStr} constant\n0x${hex(value1, t1)} << 0x${hex(value2, typeStr)} = 0x${hex(result, t1)}`;
                }
                this.writeRegister(this.regIAcc, result);
                break;
            }
            case this.instructionSet.CMP_REG_REG: {
                // CMP register1 register2
                const register1 = this.fetch(), register2 = this.fetch();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const comparison = compare(value1, value2);
                if (this.executionConfig.commentary) {
                    info.text = `Compare register ${this._registerOffsets[register1]} and register ${this._registerOffsets[register2]}\ncompare(0x${hex(value1)}, 0x${hex(value2)}) => ${comparison} (${CMP[comparison]})`;
                }
                this.writeRegister('cmp', comparison);
                break;
            }
            case this.instructionSet.CMP_REG_CONST: {
                // CMP register1 constant
                const register = this.fetch();
                const value1 = this.readRegister(register), value2 = this.fetch();
                info.args = [register, value2];
                const comparison = compare(value1, value2);
                if (this.executionConfig.commentary) {
                    const v2hex = hex(value2);
                    info.text = `Compare register ${this._registerOffsets[register]} and 0x${v2hex}\ncompare(0x${hex(value1)}, 0x${v2hex}) => ${comparison} (${CMP[comparison]})`;
                }
                this.writeRegister('cmp', comparison);
                break;
            }
            case this.instructionSet.JMP_CONST: {
                // JMP constant
                const constant = this.fetch();
                info.args = [constant];
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to 0x${hex(constant)}`;
                }
                this.writeRegister(this._ip, constant);
                break;
            }
            case this.instructionSet.JMP_REG: {
                // JMP register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [register];
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${hex(registerVal)})`;
                }
                this.writeRegister(this._ip, registerVal);
                break;
            }
            case this.instructionSet.JEQ_CONST: {
                // JEQ constant
                const constant = this.fetch();
                info.args = [constant];
                const condition = this.readRegister("cmp") === CMP.EQUAL_TO;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to 0x${hex(constant)} if 'equal to' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, constant);
                break;
            }
            case this.instructionSet.JEG_REG: {
                // JEQ register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [register];
                const condition = this.readRegister("cmp") === CMP.EQUAL_TO;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${hex(registerVal)}) if 'equal to' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, registerVal);
                break;
            }
            case this.instructionSet.JNE_CONST: {
                // JNE constant
                const constant = this.fetch();
                info.args = [constant];
                const condition = this.readRegister("cmp") !== CMP.EQUAL_TO;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to 0x${hex(constant)} if 'not equal to' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, constant);
                break;
            }
            case this.instructionSet.JNE_REG: {
                // JNE register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [register];
                const condition = this.readRegister("cmp") !== CMP.EQUAL_TO;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${hex(registerVal)}) if 'not equal to' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, registerVal);
                break;
            }
            case this.instructionSet.JLT_CONST: {
                // JLT constant
                const constant = this.fetch();
                info.args = [constant];
                const condition = this.readRegister("cmp") === CMP.LESS_THAN;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to 0x${hex(constant)} if 'less than' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, constant);
                break;
            }
            case this.instructionSet.JLT_REG: {
                // JLT register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [register];
                const condition = this.readRegister("cmp") === CMP.LESS_THAN;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${hex(registerVal)}) if 'less than' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, registerVal);
                break;
            }
            case this.instructionSet.JGT_CONST: {
                // JGT constant
                const constant = this.fetch();
                info.args = [constant];
                const condition = this.readRegister("cmp") === CMP.GREATER_THAN;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to 0x${hex(constant)} if 'greater than' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, constant);
                break;
            }
            case this.instructionSet.JGT_REG: {
                // JGT register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [register];
                const condition = this.readRegister("cmp") === CMP.GREATER_THAN;
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${hex(registerVal)}) if 'greater than' --> ${condition.toString().toUpperCase()}`;
                }
                if (condition) this.writeRegister(this._ip, registerVal);
                break;
            }
            case this.instructionSet.PUSH_CONST: {
                // PUSH constant
                const constant = this.fetch();
                info.args = [constant];
                this.push(constant);
                if (this.executionConfig.commentary) {
                    info.text = `Push constant 0x${hex(constant)} to stack\nSP = 0x${hex(this.readRegister('sp'))}; FP = 0x${hex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.PUSH_REG: {
                // PUSH register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [registerVal];
                this.push(registerVal);
                if (this.executionConfig.commentary) {
                    info.text = `Push register ${this._registerOffsets[register]} (0x${hex(registerVal)}) to stack\nSP = 0x${hex(this.readRegister('sp'))}; FP = 0x${hex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.POP: {
                // POP register
                const register = this.fetch();
                const value = this.pop();
                info.args = [register];
                if (this.executionConfig.commentary) {
                    const rSymbol = this._registerOffsets[register];
                    info.text = `Pop value to register ${rSymbol}\n${rSymbol} = 0x${hex(value)}`;
                }
                this.writeRegister(register, value);
                break;
            }
            case this.instructionSet.CALL_CONST: {
                // CALL constant
                const constant = this.fetch();
                info.args = [constant];
                this.pushFrame();
                this.writeRegister("ip", constant);
                if (this.executionConfig.commentary) {
                    info.text = `Call subroutine @ 0x${hex(constant)}\nSP = 0x${hex(this.readRegister('sp'))}; FP = 0x${hex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.CALL_REG: {
                // CALL register
                const register = this.fetch();
                const registerVal = this.readRegister(register);
                info.args = [registerVal];
                this.pushFrame();
                this.writeRegister("ip", registerVal);
                if (this.executionConfig.commentary) {
                    info.text = `Call subroutine @ register ${this._registerOffsets[register]} (0x${hex(registerVal)})\nSP = 0x${hex(this.readRegister('sp'))}; FP = 0x${hex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.RET: {
                // RET
                if (this.executionConfig.commentary) {
                    const oldIP = this.readRegister("ip");
                    this.popFrame();
                    const newIP = this.readRegister("ip");
                    info.text = `Return from subroutine\nOld IP = 0x${hex(oldIP)}; New IP = 0x${hex(newIP)}\nSP = 0x${hex(this.readRegister('sp'))}; FP = 0x${hex(this.readRegister('fp'))}`;
                } else {
                    this.popFrame();
                }
                break;
            }

            case this.instructionSet.BRK: {
                // BRK
                if (this.executionConfig.commentary) {
                    info.text = `<Breakpoint> Pause Execution\nIP = 0x${hex(this.readRegister('ip'))}`;
                }
                continueExec = false;
                debugger;
                break;
            }
            default:
                info.termination = true;
                this._throwUnknownOpcode(opcode);
        }
        info.termination = !continueExec;
        return continueExec;
    }
}

export default RSProcessor;