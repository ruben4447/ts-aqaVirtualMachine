import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { NumberType } from "../../types/general";
import { arrayToBuffer, hex } from "../../utils/general";
import { CMP, compare } from '../../utils/CPU';
import CPU from "./CPU";
import { instructionSet } from '../../instruction-set/aqa-arm';

export class ARMProcessor extends CPU {
  public static readonly defaultRegisters: string[] = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12"];
  public static readonly defaultNumType: NumberType = 'float32';
  public static readonly requiredRegisters: string[] = ["ip", "cmp"];
  public readonly model: CPUModel = CPUModel.AQAARM;
  
  constructor(config: ICPUConfiguration) {
    // Call super's constructor, but wih our defaults
    super(instructionSet, config, ARMProcessor.defaultRegisters, ARMProcessor.defaultNumType, ARMProcessor.requiredRegisters);
  }

  /** @override */
  public execute(opcode: number, info: IExecuteRecord): boolean {
    let continueExec = true;

    switch (opcode) {
      case this.instructionSet.NULL:
        // NULL
        if (this.executionConfig.commentary) info.text = this.executionConfig.haltOnNull ? 'NULL: halted programme execution' : 'Skip NULL instruction';
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
          info.text = `Load value at address 0x${this.toHex(address)} (0x${this.toHex(addressValue)}) to register ${this.registerMap[register]}`;
        }
        this.writeRegister(register, addressValue);
        break;
      }
      case this.instructionSet.LDR_PTR: {
        // LDR register registerPtr
        const register = this.fetch(), registerPtr = this.fetch();
        const address = this.readRegister(registerPtr), addressValue = this.readMemory(address);
        info.args = [register, registerPtr];
        if (this.executionConfig.commentary) {
          info.text = `Load value at address in register ${this.registerMap[registerPtr]} (address 0x${this.toHex(address)} -> 0x${this.toHex(addressValue)}) into register ${this.registerMap[register]}`;
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
          info.text = `Load value in register ${this.registerMap[register]} (0x${this.toHex(registerValue)}) to memory address 0x${address}`;
        }
        this.writeMemory(address, registerValue);
        break;
      }
      case this.instructionSet.STR_PTR: {
        // STR register registerPtr
        const register = this.fetch(), registerPtr = this.fetch();
        const registerValue = this.readRegister(register), address = this.readRegister(registerPtr);
        info.args = [register, registerPtr];
        if (this.executionConfig.commentary) {
          info.text = `Load value in register ${this.registerMap[register]} (0x${this.toHex(registerValue)}) to memory address in register ${this.registerMap[registerPtr]} (0x${this.toHex(address)})`;
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
          info.text = `Store register ${this.registerMap[register2]} + register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} + 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} + address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} + 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} + 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} + 0x${constantHex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} - register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} - 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} - address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} - 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} - 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} - 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.MUL_REG: {
        // MUL register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val * register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this.registerMap[register2]} * register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} * 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.MUL_ADDR: {
        // MUL register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val * addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this.registerMap[register2]} * address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} * 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.MUL_CONST: {
        // MUL register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val * constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this.registerMap[register2]} * 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} * 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.DIV_REG: {
        // DIV register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = register2val / register3val;
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this.registerMap[register2]} / register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} / 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.DIV_ADDR: {
        // DIV register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = register2val / addressVal;
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this.registerMap[register2]} / address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} / 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.DIV_CONST: {
        // DIV register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = register2val / constant;
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this.registerMap[register2]} / 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} / 0x${constantHex} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.EXP_REG: {
        // EXP register1 register2 register3
        const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
        const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
        const result = Math.pow(register2val, register3val);
        info.args = [register1, register2, register3];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this.registerMap[register2]} ** register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} ** 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.EXP_ADDR: {
        // EXP register1 register2 address
        const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
        const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
        const result = Math.pow(register2val, addressVal);
        info.args = [register1, register2, address];
        if (this.executionConfig.commentary) {
          info.text = `Store register ${this.registerMap[register2]} ** address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} ** 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
        }
        this.writeRegister(register1, result);
        break;
      }
      case this.instructionSet.EXP_CONST: {
        // EXP register1 register2 constant
        const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
        const register2val = this.readRegister(register2);
        const result = Math.pow(register2val, constant);
        info.args = [register1, register2, constant];
        if (this.executionConfig.commentary) {
          const constantHex = this.toHex(constant);
          info.text = `Store register ${this.registerMap[register2]} ** 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} ** 0x${constantHex} = 0x${this.toHex(result)}`;
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
          info.text = `Copy contents of register ${this.registerMap[register2]} (0x${this.toHex(register2val)}) into register ${this.registerMap[register1]}`;
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
          info.text = `Copy contents of address 0x${this.toHex(address)} (0x${this.toHex(value)}) into register ${this.registerMap[register]}`;
        }
        this.writeRegister(register, value);
        break;
      }
      case this.instructionSet.MOV_CONST_REG: {
        // MOV register constant
        const register = this.fetch(), constant = this.fetch();
        info.args = [register, constant];
        if (this.executionConfig.commentary) {
          info.text = `Move constant 0x${this.toHex(constant)} into register ${this.registerMap[register]}`;
        }
        this.writeRegister(register, constant);
        break;
      }
      case this.instructionSet.MOV_REGPTR_REG: {
        // MOV registerPtr register
        const registerPtr = this.fetch(), register = this.fetch();
        const address = this.readRegister(registerPtr), registerValue = this.readRegister(register);
        info.args = [registerPtr, register];
        if (this.executionConfig.commentary) {
          info.text = `Copy value at register ${this.registerMap[register]} (0x${this.toHex(registerValue)}) to address in register ${this.registerMap[registerPtr]} (address 0x${this.toHex(address)})`;
        }
        this.writeMemory(address, registerValue);
        break;
      }
      case this.instructionSet.CMP_REG: {
        // CMP register1 register2
        const register1 = this.fetch(), register2 = this.fetch();
        const register1value = this.readRegister(register1), register2value = this.readRegister(register2);
        info.args = [register1, register2];
        const comparison = compare(register1value, register2value);
        if (this.executionConfig.commentary) {
          info.text = `Compare register ${this.registerMap[register1]} (0x${this.toHex(register1value)}) and register ${this.registerMap[register2]} (0x${this.toHex(register2value)}) --> ${comparison} (${CMP[comparison]})`;
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
          info.text = `Compare register ${this.registerMap[register]} (0x${this.toHex(registerValue)}) and address 0x${this.toHex(address)} (0x${this.toHex(addressValue)}) --> ${comparison} (${CMP[comparison]})`;
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
          info.text = `Compare register ${this.registerMap[register]} (0x${this.toHex(registerValue)}) and constant 0x${this.toHex(constant)} --> ${comparison} (${CMP[comparison]})`;
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
          info.text = `Store register ${this.registerMap[register2]} AND register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} & 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} AND address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} & 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} AND 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} & 0x${constantHex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} OR register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} | 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} OR address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} | 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} OR 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} | 0x${constantHex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} XOR register ${this.registerMap[register3]} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} ^ 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} XOR address 0x${hex(address)} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} ^ 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} XOR 0x${constantHex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} ^ 0x${constantHex} = 0x${this.toHex(result)}`;
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
          info.text = `Store NOT register ${this.registerMap[register2]} (0x${hex}) and store in register ${this.registerMap[register1]}\n~0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store NOT value at address 0x${this.toHex(address)} (0x${hex}) and store in register ${this.registerMap[register]}\n~0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store NOT constant 0x${this.toHex(constant)} (0x${hex}) and store in register ${this.registerMap[register]}\n~0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} << register ${this.registerMap[register3]} (0x${hex}) in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} << 0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} << value at address 0x${this.toHex(address)} (0x${hex}) in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} << 0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} << constant 0x${hex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} << 0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} >> register ${this.registerMap[register3]} (0x${hex}) in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} >> 0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} >> value at address 0x${this.toHex(address)} (0x${hex}) in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} >> 0x${hex} = 0x${this.toHex(result)}`;
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
          info.text = `Store register ${this.registerMap[register2]} >> constant 0x${hex} in register ${this.registerMap[register1]}\n0x${this.toHex(register2val)} >> 0x${hex} = 0x${this.toHex(result)}`;
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
      case this.instructionSet.INP: {
        // INP registers
        let register = this.fetch();
        info.args = [register];
        let userInput = +(globalThis.prompt(`STDIN: integer to register ${this.registerMap[register]}`, '0'));
        if (this.executionConfig.commentary) {
          info.text = `Load user input to register ${this.registerMap[register]} - STDIN recieved 0x${this.toHex(userInput)}`;
        }
        this.writeRegister(register, userInput);
        break;
      }
      case this.instructionSet.INPSTR_ADDR: {
        // INPSTR address
        let address = this.fetch();
        info.args = [address];
        let string = globalThis.prompt(`STDIN: string to address 0x${this.toHex(address)}:`, '');
        let nums = string.split('').map(x => x.charCodeAt(0));
        nums.push(0);
        if (this.executionConfig.commentary) {
          info.text = `Load user input string to address 0x${this.toHex(address)}`;
        }
        this.loadMemoryBytes(address, arrayToBuffer(nums, this.numType));
        break;
      }
      case this.instructionSet.INPSTR_PTR: {
        // INPSTR registerPtr
        const registerPtr = this.fetch(), address = this.readRegister(registerPtr);
        info.args = [registerPtr];
        let string = globalThis.prompt(`STDIN: string to address 0x${this.toHex(address)}:`, '');
        let nums = string.split('').map(x => x.charCodeAt(0));
        nums.push(0);
        if (this.executionConfig.commentary) {
          info.text = `Load user input string to address stored in register ${this.registerMap[registerPtr]} (0x${this.toHex(address)})`;
        }
        this.loadMemoryBytes(address, arrayToBuffer(nums, this.numType));
        break;
      }
      case this.instructionSet.OUT: {
        // OUT registers
        let register = this.fetch(), value = this.readRegister(register);
        info.args = [register];
        if (this.executionConfig.commentary) {
          info.text = `Output register ${this.registerMap[register]}: 0x${this.toHex(value)}`;
        }
        globalThis.alert(`[STDOUT: register ${this.registerMap[register]}]\n>> ${value}`);
        break;
      }
      case this.instructionSet.OUTSTR_REG: {
        // OUTSTR register
        let register = this.fetch(), value = this.readRegister(register), chr = String.fromCharCode(value);
        info.args = [register];
        if (this.executionConfig.commentary) {
          info.text = `Output register ${this.registerMap[register]} as ASCII: ${chr} (0x${this.toHex(value)})`;
        }
        globalThis.alert(`[STDOUT: register ${this.registerMap[register]}]\n>> ${chr}`);
        break;
      }
      case this.instructionSet.OUTSTR_ADDR: {
        // OUTSTR address
        let address = this.fetch();
        info.args = [address];
        let string = '';
        for (let addr = address; ;addr++) {
          let n = this.readMemory(addr);
          if (n === 0) break;
          string += String.fromCharCode(n);
        }
        if (this.executionConfig.commentary) {
          info.text = `Output memory as null-terminated string from address 0x${this.toHex(address)} - string of length ${string.length}`;
        }
        globalThis.alert(`[STDOUT: address 0x${this.registerMap[address]}]\n>> ${string}`);
        break;
      }
      case this.instructionSet.OUTSTR_PTR: {
        // OUTSTR registerPtr
        const registerPtr = this.fetch(), address = this.readRegister(registerPtr);
        info.args = [registerPtr];
        let string = '';
        for (let addr = address; ;addr++) {
          let n = this.readMemory(addr);
          if (n === 0) break;
          string += String.fromCharCode(n);
        }
        if (this.executionConfig.commentary) {
          info.text = `Output memory as null-terminated string from address in register ${this.registerMap[registerPtr]} (0x${this.toHex(address)}) - string of length ${string.length}`;
        }
        globalThis.alert(`[STDOUT: address 0x${this.toHex(address)}]\n>> ${string}`);
        break;
      }
      default:
        info.termination = true;
        throw new Error(`execute: unknown opcode 0x${opcode.toString(16)}`);
    }
    info.termination = !continueExec;
    return continueExec;
  }
}

export default ARMProcessor;
