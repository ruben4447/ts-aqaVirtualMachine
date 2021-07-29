import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { arrayToBuffer, hex } from "../../utils/general";
import { CMP, compare } from '../../utils/CPU';
import { instructionSet as aqaInstructionSetExtended } from '../../instruction-set/aqa-arm-extended';
import ARMProcessor from "./AQA-ARM";

export class ARMProcessorExtended extends ARMProcessor {
  public readonly model: CPUModel = CPUModel.AQAARMExt;

  constructor(config: ICPUConfiguration) {
    // Call super's constructor, but wih our defaults
    super(config, aqaInstructionSetExtended);
  }

  /** @override */
  public execute(opcode: number, info: IExecuteRecord): boolean {
    let continueExec = true;

    try {
      // Try executing on AQA-ARM
      return super.execute(opcode, info);
    } catch (e) {
      // Try our extended functions
      switch (opcode) {
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
          let output = `[STDOUT: register ${this.registerMap[register]}]\n>> ${value}`;
          console.log(output);
          globalThis.alert(output);
          break;
        }
        case this.instructionSet.OUTSTR_REG: {
          // OUTSTR register
          let register = this.fetch(), value = this.readRegister(register), chr = String.fromCharCode(value);
          info.args = [register];
          if (this.executionConfig.commentary) {
            info.text = `Output register ${this.registerMap[register]} as ASCII: ${chr} (0x${this.toHex(value)})`;
          }
          let output = `[STDOUT: register ${this.registerMap[register]}]\n>> ${chr}`;
          console.log(output);
          globalThis.alert(output);
          break;
        }
        case this.instructionSet.OUTSTR_ADDR: {
          // OUTSTR address
          let address = this.fetch();
          info.args = [address];
          let string = '';
          for (let addr = address; ; addr++) {
            let n = this.readMemory(addr);
            if (n === 0) break;
            string += String.fromCharCode(n);
          }
          if (this.executionConfig.commentary) {
            info.text = `Output memory as null-terminated string from address 0x${this.toHex(address)} - string of length ${string.length}`;
          }
          let output = `[STDOUT: address 0x${this.registerMap[address]}]\n>> ${string}`;
          globalThis.alert(output);
          console.log(output);
          break;
        }
        case this.instructionSet.OUTSTR_PTR: {
          // OUTSTR registerPtr
          const registerPtr = this.fetch(), address = this.readRegister(registerPtr);
          info.args = [registerPtr];
          let string = '';
          for (let addr = address; ; addr++) {
            let n = this.readMemory(addr);
            if (n === 0) break;
            string += String.fromCharCode(n);
          }
          if (this.executionConfig.commentary) {
            info.text = `Output memory as null-terminated string from address in register ${this.registerMap[registerPtr]} (0x${this.toHex(address)}) - string of length ${string.length}`;
          }
          let output = `[STDOUT: address 0x${this.toHex(address)}]\n>> ${string}`;
          console.log(output);
          globalThis.alert(output);
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
        case this.instructionSet.SQRT_REG: {
          // SQRT register
          const register = this.fetch();
          const registerVal = this.readRegister(register);
          const result = Math.sqrt(registerVal);
          info.args = [register];
          if (this.executionConfig.commentary) {
            info.text = `Caculate register sqrt(${this.registerMap[register]})\nsqrt(0x${this.toHex(registerVal)}) = 0x${this.toHex(result)}`;
          }
          this.writeRegister(register, result);
          break;
        }
        default:
          info.termination = true;
          throw new Error(`execute: unknown opcode 0x${opcode.toString(16)}`);
      }
    }
    info.termination = !continueExec;
    return continueExec;
  }
}

export default ARMProcessorExtended;
