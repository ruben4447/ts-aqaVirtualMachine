import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { NumberType } from "../../types/general";
import { arrayToBuffer, hex } from "../../utils/general";
import { CMP, compare, createRegister } from '../../utils/CPU';
import CPU from "./CPU";
import { instructionSet as aqaInstructionSet } from '../../instruction-set/aqa-arm';
import { IInstructionSet } from "../../types/Assembler";

export class ARMProcessor extends CPU {
  public static readonly defaultNumType: NumberType = 'float32';
  public readonly model: CPUModel = CPUModel.AQAARM;

  /** Instruction set defaults to AQA arm; present only for overloading purposes */
  constructor(config: ICPUConfiguration, instructionSet?: IInstructionSet) {
    // Call super's constructor, but wih our defaults
    config.appendRegisterMap = { ...config.appendRegisterMap, cmp: createRegister(16, 'int64', false, 'Stack frame pointer (points to top of current stack frame)') };
    super(instructionSet ?? aqaInstructionSet, config, ARMProcessor.defaultNumType);

    this.resetRegisters();
  }

  public execute(opcode: number, info: IExecuteRecord): boolean {
    let continueExec = true;

    switch (opcode) {
      case this.instructionSet.NOP:
        // NOP
        if (this.executionConfig.commentary) info.text = this.executionConfig.haltOnNull ? 'NOP: halted programme execution' : 'Skip NOP instruction';
        continueExec = !this.executionConfig.haltOnNull;
        break;
      case this.instructionSet.HALT:
        // HALT
        if (this.executionConfig.commentary) info.text = 'Halt programme execution';
        continueExec = false;
        break;
      case this.instructionSet.LDR: {
        // LDR register address
        const register = this.fetch(), address = this.fetch();
        const addressValue = this.readMemory(address);
        info.args = [register, address];
        if (this.executionConfig.commentary) {
          info.text = `Load value at address 0x${this.toHex(address)} (0x${this.toHex(addressValue)}) to register ${this._registerOffsets[register]}`;
        }
        this.writeRegister(register, addressValue);
        break;
      }
      case this.instructionSet.STR: {
        // STR register address
        const register = this.fetch(), address = this.fetch();
        const registerValue = this.readRegister(register);
        info.args = [register, address];
        if (this.executionConfig.commentary) {
          info.text = `Load value in register ${this._registerOffsets[register]} (0x${this.toHex(registerValue)}) to memory address 0x${address}`;
        }
        this.writeMemory(address, registerValue);
        break;
      }
      case this.instructionSet.ADD_REG: {
        // ADD register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val + register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} + register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} + 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.ADD_ADDR: {
        // ADD register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val + addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} + address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} + 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.ADD_CONST: {
        // ADD register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val + constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} + 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} + 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.SUB_REG: {
        // SUB register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val - register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} - register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} - 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.SUB_ADDR: {
        // SUB register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val - addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} - address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} - 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.SUB_CONST: {
        // SUB register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val - constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} - 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} - 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.MOV_REG_REG: {
        // MOV register1 register2
        const register1 = this.fetch(), register2 = this.fetch();
        const register2val = this.readRegister(register2);
        info.args = [register1, register2];
        if (this.executionConfig.commentary) {
          info.text = `Copy contents of register ${this._registerOffsets[register2]} (0x${this.toHex(register2val)}) into register ${this._registerOffsets[register1]}`;
        }
        this.writeRegister(register1, register2val);
        break;
      }
      case this.instructionSet.MOV_ADDR_REG: {
        // MOV register address
        const register = this.fetch(), address = this.fetch();
        const value = this.readMemory(address);
        info.args = [register, register];
        if (this.executionConfig.commentary) {
          info.text = `Copy contents of address 0x${this.toHex(address)} (0x${this.toHex(value)}) into register ${this._registerOffsets[register]}`;
        }
        this.writeRegister(register, value);
        break;
      }
      case this.instructionSet.MOV_CONST_REG: {
        // MOV register constant
        const register = this.fetch(), constant = this.fetch();
        info.args = [register, constant];
        if (this.executionConfig.commentary) {
          info.text = `Move constant 0x${this.toHex(constant)} into register ${this._registerOffsets[register]}`;
        }
        this.writeRegister(register, constant);
        break;
      }
      case this.instructionSet.CMP_REG: {
        // CMP register1 register2
        const register1 = this.fetch(), register2 = this.fetch();
        const register1value = this.readRegister(register1), register2value = this.readRegister(register2);
        info.args = [register1, register2];
        const comparison = compare(register1value, register2value);
        if (this.executionConfig.commentary) {
          info.text = `Compare register ${this._registerOffsets[register1]} (0x${this.toHex(register1value)}) and register ${this._registerOffsets[register2]} (0x${this.toHex(register2value)}) --> ${comparison} (${CMP[comparison]})`;
        }
        this.writeRegister('cmp', comparison);
        break;
      }
      case this.instructionSet.CMP_ADDR: {
        // CMP register address
        const register = this.fetch(), address = this.fetch();
        const registerValue = this.readRegister(register), addressValue = this.readMemory(address);
        info.args = [register, address];
        const comparison = compare(registerValue, addressValue);
        if (this.executionConfig.commentary) {
          info.text = `Compare register ${this._registerOffsets[register]} (0x${this.toHex(registerValue)}) and address 0x${this.toHex(address)} (0x${this.toHex(addressValue)}) --> ${comparison} (${CMP[comparison]})`;
        }
        this.writeRegister('cmp', comparison);
        break;
      }
      case this.instructionSet.CMP_CONST: {
        // CMP register constant
        const register = this.fetch(), constant = this.fetch();
        const registerValue = this.readRegister(register);
        info.args = [register, constant];
        const comparison = compare(registerValue, constant);
        if (this.executionConfig.commentary) {
          info.text = `Compare register ${this._registerOffsets[register]} (0x${this.toHex(registerValue)}) and constant 0x${this.toHex(constant)} --> ${comparison} (${CMP[comparison]})`;
        }
        this.writeRegister('cmp', comparison);
        break;
      }
      case this.instructionSet.AND_REG: {
        // AND register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val & register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} AND register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} & 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.AND_ADDR: {
        // AND register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val & addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} AND address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} & 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.AND_CONST: {
        // AND register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val & constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} AND 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} & 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.ORR_REG: {
        // ORR register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val | register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} OR register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} | 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.ORR_ADDR: {
        // ORR register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val | addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} OR address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} | 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.ORR_CONST: {
        // ORR register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val | constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} OR 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} | 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.EOR_REG: {
        // EOR register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val ^ register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} XOR register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} ^ 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.EOR_ADDR: {
        // EOR register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val ^ addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this._registerOffsets[register2]} XOR address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} ^ 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.EOR_CONST: {
        // EOR register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val ^ constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} XOR 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} ^ 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.MVN_REG: {
        // MVN register1 register2
        const register1 = this.fetch(), register2 = this.fetch();
        const register2val = this.readRegister(register2);
        info.args = [register1, register2];
        const result = ~register2val;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(register2val);
          info.text = `Store NOT register ${this._registerOffsets[register2]} (0x${hex}) and store in register ${this._registerOffsets[register1]}\n~0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.MVN_ADDR: {
        // MVN register address
        const register = this.fetch(), address = this.fetch();
        const addressVal = this.readRegister(address);
        info.args = [register, address];
        const result = ~addressVal;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(addressVal);
          info.text = `Store NOT value at address 0x${this.toHex(address)} (0x${hex}) and store in register ${this._registerOffsets[register]}\n~0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register, result);
        break;
      }
      case this.instructionSet.MVN_CONST: {
        // MVN register constant
        const register = this.fetch(), constant = this.fetch();
        info.args = [register, constant];
        const result = ~constant;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(constant);
          info.text = `Store NOT constant 0x${this.toHex(constant)} (0x${hex}) and store in register ${this._registerOffsets[register]}\n~0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register, result);
        break;
      }
      case this.instructionSet.LSL_REG: {
        // LSL register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        info.args = [register1, register2, register3];
        const result = register2val << register3val;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(register3val);
          info.text = `Store register ${this._registerOffsets[register2]} << register ${this._registerOffsets[register3]} (0x${hex}) in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} << 0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.LSL_ADDR: {
        // LSL register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readRegister(address);
        info.args = [register1, register2, address];
        const result = register2val << addressVal;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(addressVal);
          info.text = `Store register ${this._registerOffsets[register2]} << value at address 0x${this.toHex(address)} (0x${hex}) in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} << 0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.LSL_CONST: {
        // LSL register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        info.args = [register1, register2, constant];
        const result = register2val << constant;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} << constant 0x${hex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} << 0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.LSR_REG: {
        // LSR register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        info.args = [register1, register2, register3];
        const result = register2val >> register3val;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(register3val);
          info.text = `Store register ${this._registerOffsets[register2]} >> register ${this._registerOffsets[register3]} (0x${hex}) in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} >> 0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.LSR_ADDR: {
        // LSR register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readRegister(address);
        info.args = [register1, register2, address];
        const result = register2val >> addressVal;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(addressVal);
          info.text = `Store register ${this._registerOffsets[register2]} >> value at address 0x${this.toHex(address)} (0x${hex}) in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} >> 0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.LSR_CONST: {
        // LSR register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        info.args = [register1, register2, constant];
        const result = register2val >> constant;
        if (this.executionConfig.commentary) {
          const hex = this.toHex(constant);
          info.text = `Store register ${this._registerOffsets[register2]} >> constant 0x${hex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} >> 0x${hex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.JMP_CONST: {
        // JMP constant
        const constant = this.fetch();
        info.args = [constant];
        if (this.executionConfig.commentary) {
          info.text = `Set instruction pointer to 0x${this.toHex(constant)}`;
        }
        this.writeRegister(this.regInstructionPtr, constant);
        break;
      }
      case this.instructionSet.JMP_REG: {
        // JMP register
        const register = this.fetch(), registerVal = this.readRegister(register);
        info.args = [register];
        if (this.executionConfig.commentary) {
          info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)})`;
        }
        this.writeRegister(this.regInstructionPtr, registerVal);
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
        if (condition) this.writeRegister(this.regInstructionPtr, constant);
        break;
      }
      case this.instructionSet.JEG_REG: {
        // JEQ register
        const register = this.fetch(), registerVal = this.readRegister(register);
        info.args = [register];
        const condition = this.readRegister("cmp") === CMP.EQUAL_TO;
        if (this.executionConfig.commentary) {
          info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)}) if 'equal to' --> ${condition.toString().toUpperCase()}`;
        }
        if (condition) this.writeRegister(this.regInstructionPtr, registerVal);
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
        if (condition) this.writeRegister(this.regInstructionPtr, constant);
        break;
      }
      case this.instructionSet.JNE_REG: {
        // JNE register
        const register = this.fetch(), registerVal = this.readRegister(register);
        info.args = [register];
        const condition = this.readRegister("cmp") !== CMP.EQUAL_TO;
        if (this.executionConfig.commentary) {
          info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)}) if 'not equal to' --> ${condition.toString().toUpperCase()}`;
        }
        if (condition) this.writeRegister(this.regInstructionPtr, registerVal);
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
        if (condition) this.writeRegister(this.regInstructionPtr, constant);
        break;
      }
      case this.instructionSet.JLT_REG: {
        // JLT register
        const register = this.fetch(), registerVal = this.readRegister(register);
        info.args = [register];
        const condition = this.readRegister("cmp") === CMP.LESS_THAN;
        if (this.executionConfig.commentary) {
          info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)}) if 'less than' --> ${condition.toString().toUpperCase()}`;
        }
        if (condition) this.writeRegister(this.regInstructionPtr, registerVal);
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
        if (condition) this.writeRegister(this.regInstructionPtr, constant);
        break;
      }
      case this.instructionSet.JGT_REG: {
        // JGT register
        const register = this.fetch(), registerVal = this.readRegister(register);
        info.args = [register];
        const condition = this.readRegister("cmp") === CMP.GREATER_THAN;
        if (this.executionConfig.commentary) {
          info.text = `Set instruction pointer to register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)}) if 'greater than' --> ${condition.toString().toUpperCase()}`;
        }
        if (condition) this.writeRegister(this.regInstructionPtr, registerVal);
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

export default ARMProcessor;
