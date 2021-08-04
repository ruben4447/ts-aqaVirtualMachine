import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { INumberType, NumberType } from "../../types/general";
import CPU from "./CPU";
import { instructionSet } from '../../instruction-set/rs';
import { CMP, compare, numberTypeMap, numberTypeToObject } from "../../utils/CPU";
import { getNumTypeInfo, getTextMetrics } from "../../utils/general";

export class RSProcessor extends CPU {
    public static readonly defaultRegisters: string[] = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
    public static readonly defaultNumType: NumberType = 'float32';
    public static readonly requiredRegisters: string[] = ["ip", "sp", "fp", "acc", "cmp"];
    public readonly model: CPUModel = CPUModel.RS;

    protected readonly _acc: number; // Index of accumulator register

    public constructor(config: ICPUConfiguration) {
        super(instructionSet, config, RSProcessor.defaultRegisters, RSProcessor.defaultNumType, RSProcessor.requiredRegisters);
        this._acc = this.registerMap.indexOf('acc');

        const uint8 = getNumTypeInfo("uint8");
        this.instructType = uint8;
        this.regType = uint8;
        this.instructTypeSuffixes = true;
    }

    /** Fetch from memory given data type */
    fetchType(dt: NumberType) {
        return super.fetch(numberTypeToObject[dt]);
    }

    /** Fetch byte indicating data type */
    fetchDT() { return this.fetch(numberTypeToObject["uint8"]); }

    /** Fetch register from memory */
    fetchReg() { return this.fetch(this.regType); }

    /** Get next byte indicating a DATA TYPE from memory */
    getDataType() {
        const n = this.fetch(numberTypeToObject["uint8"]);
        const str = numberTypeMap[n];
        if (str == undefined) throw new Error(`SIGILL - unknown data type flag ${n}`);
        return { type: n, typeStr: str }
    }

    /** @override */
    public execute(opcode: number, info: IExecuteRecord): boolean {
        let continueExec = true, comment = this.executionConfig.commentary;

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
                const { type, typeStr } = this.getDataType();
                console.log(type, typeStr);
                const register1 = this.fetchReg(), register2 = this.fetchReg();
                info.args = [type, register1, register2];
                const register2value = this.readRegister(register2, numberTypeToObject[typeStr]);
                if (comment) info.text = `Copy value in register ${this.registerMap[register2]} (0x${this.toHex(register2value)}) to register ${this.registerMap[register1]}`;
                this.writeRegister(register1, register2value);
                break;
            }
            case this.instructionSet.MOV_CONST_REG: {
                // MOV register constant
                const register = this.fetch(), constant = this.fetch();
                info.args = [register, constant];
                if (comment) info.text = `Move 0x${this.toHex(constant)} to register ${this.registerMap[register]}`;
                this.writeRegister(register, constant);
                break;
            }
            case this.instructionSet.MOV_ADDR_REG: {
                // MOV register address
                const register = this.fetch(), address = this.fetch();
                info.args = [register, address];
                const value = this.readMemory(address);
                if (comment) info.text = `Copy value at address 0x${this.toHex(address)} (0x${this.toHex(value)}) to register ${this.registerMap[register]}`;
                this.writeRegister(register, value);
                break;
            }
            case this.instructionSet.MOV_REG_ADDR: {
                // MOV address register
                const address = this.fetch(), register = this.fetch();
                info.args = [address, register];
                const value = this.readRegister(register);
                if (comment) info.text = `Copy value at  register ${this.registerMap[register]} (0x${this.toHex(value)}) to address 0x${this.toHex(address)}`;
                this.writeMemory(address, value);
                break;
            }
            case this.instructionSet.MOV_REGPTR_REG: {
                // MOV registerPtr register
                const registerPtr = this.fetch(), register = this.fetch();
                info.args = [registerPtr, register];
                const address = this.readRegister(registerPtr), registerValue = this.readRegister(register);
                if (comment) info.text = `Copy value at register ${this.registerMap[register]} (0x${this.toHex(registerValue)}) to address in register ${this.registerMap[registerPtr]} (address 0x${this.toHex(address)})`;
                this.writeMemory(address, registerValue);
                break;
            }
            case this.instructionSet.MOV_REG_REGPTR: {
                // MOV register registerPtr
                const register = this.fetch(), registerPtr = this.fetch();
                info.args = [register, registerPtr];
                const address = this.readRegister(registerPtr), value = this.readMemory(address);
                if (comment) info.text = `Copy value stored at address in register ${this.registerMap[register]} (address 0x${this.toHex(address)} : 0x${this.toHex(value)}) to register ${this.registerMap[registerPtr]}`;
                this.writeRegister(register, value);
                break;
            }
            case this.instructionSet.ADD_REG_REG: {
                // ADD register1 register2
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const register2 = this.fetch(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 + value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} + register ${this.registerMap[register2]}\n0x${this.toHex(value1)} + 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.ADD_REG_CONST: {
                // ADD register constant
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const value2 = this.fetch();
                info.args = [register1, value2];
                const result = value1 + value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} + constant\n0x${this.toHex(value1)} + 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.SUB_REG_REG: {
                // SUB register1 register2
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const register2 = this.fetch(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 - value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} - register ${this.registerMap[register2]}\n0x${this.toHex(value1)} - 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.SUB_REG_CONST: {
                // SUB register constant
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const value2 = this.fetch();
                info.args = [register1, value2];
                const result = value1 - value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} - constant\n0x${this.toHex(value1)} - 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.MUL_REG_REG: {
                // MUL register1 register2
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const register2 = this.fetch(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 * value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} * register ${this.registerMap[register2]}\n0x${this.toHex(value1)} * 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.MUL_REG_CONST: {
                // MUL register constant
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const value2 = this.fetch();
                info.args = [register1, value2];
                const result = value1 * value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} * constant\n0x${this.toHex(value1)} * 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.DIV_REG_REG: {
                // DIV register1 register2
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const register2 = this.fetch(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = value1 / value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} / register ${this.registerMap[register2]}\n0x${this.toHex(value1)} / 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.DIV_REG_CONST: {
                // DIV register constant
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const value2 = this.fetch();
                info.args = [register1, value2];
                const result = value1 / value2;
                if (comment) info.text = `Register ${this.registerMap[register1]} / constant\n0x${this.toHex(value1)} / 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.IDIV_REG_REG: {
                // IDIV register1 register2
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const register2 = this.fetch(), value2 = this.readRegister(register2);
                info.args = [register1, register2];
                const result = Math.floor(value1 / value2);
                if (comment) info.text = `int(register ${this.registerMap[register1]} / register ${this.registerMap[register2]})\nint(0x${this.toHex(value1)} / 0x${this.toHex(value2)}) = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.IDIV_REG_CONST: {
                // IDIV register constant
                const register1 = this.fetch(), value1 = this.readRegister(register1);
                const value2 = this.fetch();
                info.args = [register1, value2];
                const result = Math.floor(value1 / value2);
                if (comment) info.text = `int(register ${this.registerMap[register1]} / constant)\nint(0x${this.toHex(value1)} / 0x${this.toHex(value2)}) = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.SQRT: {
                // SQRT
                const acc = this.readRegister(this._acc), result = Math.sqrt(acc);
                if (comment) info.text = `accumulator = sqrt(accumulator)\nsqrt(0x${this.toHex(acc)}) = 0x${this.toHex(result)}`;
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.INC: {
                // INC register
                const register = this.fetch(), value = this.readRegister(register), result = value + 1;
                if (comment) {
                    const name = this.registerMap[register];
                    info.text = `${name} = ${name} + 1\n0x${this.toHex(value)} + 0x${this.toHex(1)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.DEC: {
                // DEC register
                const register = this.fetch(), value = this.readRegister(register), result = value - 1;
                if (comment) {
                    const name = this.registerMap[register];
                    info.text = `${name} = ${name} - 1\n0x${this.toHex(value)} - 0x${this.toHex(1)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.AND_REG_REG: {
                // AND register1 register2
                const register1 = this.fetch(), register2 = this.fetch();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = value1 & value2;
                if (comment) {
                    info.text = `Register ${this.registerMap[register1]} & register ${this.registerMap[register2]}\n0x${this.toHex(value1)} & 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.AND_REG_CONST: {
                // AND register constant
                const register = this.fetch(), constant = this.fetch();
                info.args = [register, constant];
                const regValue = this.readRegister(register);
                const result = regValue & constant;
                if (comment) {
                    let cHex = this.toHex(constant);
                    info.text = `Register ${this.registerMap[register]} & 0x${cHex}\n0x${this.toHex(regValue)} & 0x${cHex} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.OR_REG_REG: {
                // OR register1 register2
                const register1 = this.fetch(), register2 = this.fetch();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = value1 | value2;
                if (comment) {
                    info.text = `Register ${this.registerMap[register1]} | register ${this.registerMap[register2]}\n0x${this.toHex(value1)} | 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.OR_REG_CONST: {
                // OR register constant
                const register = this.fetch(), constant = this.fetch();
                info.args = [register, constant];
                const regValue = this.readRegister(register);
                const result = regValue | constant;
                if (comment) {
                    let cHex = this.toHex(constant);
                    info.text = `Register ${this.registerMap[register]} | 0x${cHex}\n0x${this.toHex(regValue)} | 0x${cHex} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.XOR_REG_REG: {
                // XOR register1 register2
                const register1 = this.fetch(), register2 = this.fetch();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = value1 ^ value2;
                if (comment) {
                    info.text = `Register ${this.registerMap[register1]} ^ register ${this.registerMap[register2]}\n0x${this.toHex(value1)} ^ 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.XOR_REG_CONST: {
                // XOR register constant
                const register = this.fetch(), constant = this.fetch();
                info.args = [register, constant];
                const regValue = this.readRegister(register);
                const result = regValue ^ constant;
                if (comment) {
                    let cHex = this.toHex(constant);
                    info.text = `Register ${this.registerMap[register]} ^ 0x${cHex}\n0x${this.toHex(regValue)} ^ 0x${cHex} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.NOT: {
                // NOT register
                const register = this.fetch();
                info.args = [register];
                const regValue = this.readRegister(register);
                const result = ~regValue;
                if (comment) {
                    info.text = `NOT register ${this.registerMap[register]}\n~0x${this.toHex(regValue)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(this._acc, result);
                break;
            }
            case this.instructionSet.LSF_REG_REG: {
                // LSF register1 register2
                const register1 = this.fetch(), register2 = this.fetch();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = value1 << value2;
                if (comment) {
                    info.text = `Left shift register ${this.registerMap[register1]} by register ${this.registerMap[register2]}\n0x${this.toHex(value1)} << 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(register1, result);
                break;
            }
            case this.instructionSet.LSF_REG_CONST: {
                // LSF register1 constant
                const register1 = this.fetch();
                const value1 = this.readRegister(register1), value2 = this.fetch();
                info.args = [register1, value2];
                const result = value1 << value2;
                if (comment) {
                    let v2hex = this.toHex(value2);
                    info.text = `Left shift register ${this.registerMap[register1]} by 0x${v2hex}\n0x${this.toHex(value1)} << 0x${v2hex} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(register1, result);
                break;
            }
            case this.instructionSet.LSF_REG_REG: {
                // RSF register1 register2
                const register1 = this.fetch(), register2 = this.fetch();
                info.args = [register1, register2];
                const value1 = this.readRegister(register1), value2 = this.readRegister(register2);
                const result = value1 >> value2;
                if (comment) {
                    info.text = `Right shift register ${this.registerMap[register1]} by register ${this.registerMap[register2]}\n0x${this.toHex(value1)} >> 0x${this.toHex(value2)} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(register1, result);
                break;
            }
            case this.instructionSet.RSF_REG_CONST: {
                // RSF register1 constant
                const register1 = this.fetch();
                const value1 = this.readRegister(register1), value2 = this.fetch();
                info.args = [register1, value2];
                const result = value1 >> value2;
                if (comment) {
                    let v2hex = this.toHex(value2);
                    info.text = `Right shift register ${this.registerMap[register1]} by 0x${v2hex}\n0x${this.toHex(value1)} >> 0x${v2hex} = 0x${this.toHex(result)}`;
                }
                this.writeRegister(register1, result);
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
                    info.text = `Compare register ${this.registerMap[register1]} and register ${this.registerMap[register2]}\ncompare(0x${this.toHex(value1)}, 0x${this.toHex(value2)}) => ${comparison} (${CMP[comparison]})`;
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
                    const v2hex = this.toHex(value2);
                    info.text = `Compare register ${this.registerMap[register]} and 0x${v2hex}\ncompare(0x${this.toHex(value1)}, 0x${v2hex}) => ${comparison} (${CMP[comparison]})`;
                }
                this.writeRegister('cmp', comparison);
                break;
            }
            case this.instructionSet.JMP_CONST: {
                // JMP constant
                const constant = this.fetch();
                info.args = [constant];
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to 0x${this.toHex(constant)}`;
                }
                this.writeRegister(this._ip, constant);
                break;
            }
            case this.instructionSet.JMP_REG: {
                // JMP register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [register];
                if (this.executionConfig.commentary) {
                    info.text = `Set instruction pointer to register ${this.registerMap[register]} (0x${this.toHex(registerVal)})`;
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
                    info.text = `Set instruction pointer to 0x${this.toHex(constant)} if 'equal to' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to register ${this.registerMap[register]} (0x${this.toHex(registerVal)}) if 'equal to' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to 0x${this.toHex(constant)} if 'not equal to' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to register ${this.registerMap[register]} (0x${this.toHex(registerVal)}) if 'not equal to' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to 0x${this.toHex(constant)} if 'less than' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to register ${this.registerMap[register]} (0x${this.toHex(registerVal)}) if 'less than' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to 0x${this.toHex(constant)} if 'greater than' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Set instruction pointer to register ${this.registerMap[register]} (0x${this.toHex(registerVal)}) if 'greater than' --> ${condition.toString().toUpperCase()}`;
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
                    info.text = `Push constant 0x${this.toHex(constant)} to stack\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.PUSH_REG: {
                // PUSH register
                const register = this.fetch(), registerVal = this.readRegister(register);
                info.args = [registerVal];
                this.push(registerVal);
                if (this.executionConfig.commentary) {
                    info.text = `Push register ${this.registerMap[register]} (0x${this.toHex(registerVal)}) to stack\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.POP: {
                // POP register
                const register = this.fetch();
                const value = this.pop();
                info.args = [register];
                if (this.executionConfig.commentary) {
                    const rSymbol = this.registerMap[register];
                    info.text = `Pop value to register ${rSymbol}\n${rSymbol} = 0x${this.toHex(value)}`;
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
                    info.text = `Call subroutine @ 0x${this.toHex(constant)}\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
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
                    info.text = `Call subroutine @ register ${this.registerMap[register]} (0x${this.toHex(registerVal)})\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
                }
                break;
            }
            case this.instructionSet.RET: {
                // RET
                if (this.executionConfig.commentary) {
                    const oldIP = this.readRegister("ip");
                    this.popFrame();
                    const newIP = this.readRegister("ip");
                    info.text = `Return from subroutine\nOld IP = 0x${this.toHex(oldIP)}; New IP = 0x${this.toHex(newIP)}\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
                } else {
                    this.popFrame();
                }
                break;
            }

            case this.instructionSet.BRK: {
                // BRK
                if (this.executionConfig.commentary) {
                    info.text = `<Breakpoint> Pause Execution\nIP = 0x${this.toHex(this.readRegister('ip'))}`;
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