import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { arrayToBuffer, castNumber, getNumTypeInfo, hex, numberToString, numberTypeMap } from "../../utils/general";
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
            info.text = `Load value in register ${this._registerOffsets[register]} (0x${this.toHex(registerValue)}) to memory address in register ${this._registerOffsets[registerPtr]} (0x${this.toHex(address)})`;
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
            info.text = `Load value at address in register ${this._registerOffsets[registerPtr]} (address 0x${this.toHex(address)} -> 0x${this.toHex(addressValue)}) into register ${this._registerOffsets[register]}`;
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
            info.text = `Copy value at register ${this._registerOffsets[register]} (0x${this.toHex(registerValue)}) to address in register ${this._registerOffsets[registerPtr]} (address 0x${this.toHex(address)})`;
          }
          this.writeMemory(address, registerValue);
          break;
        }
        case this.instructionSet.INP: {
          // INP registers
          let register = this.fetch();
          info.args = [register];
          let userInput = +(globalThis.prompt(`STDIN: integer to register ${this._registerOffsets[register]}`, '0'));
          if (this.executionConfig.commentary) {
            info.text = `Load user input to register ${this._registerOffsets[register]} - STDIN recieved 0x${this.toHex(userInput)}`;
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
            info.text = `Load user input string to address stored in register ${this._registerOffsets[registerPtr]} (0x${this.toHex(address)})`;
          }
          this.loadMemoryBytes(address, arrayToBuffer(nums, this.numType));
          break;
        }
        case this.instructionSet.OUT: {
          // OUT registers
          let register = this.fetch(), value = this.readRegister(register);
          info.args = [register];
          if (this.executionConfig.commentary) {
            info.text = `Output register ${this._registerOffsets[register]}: 0x${this.toHex(value)}`;
          }
          let output = `[STDOUT: register ${this._registerOffsets[register]}] >> ${value}`;
          console.log(output);
          globalThis.alert(output);
          break;
        }
        case this.instructionSet.OUTSTR_REG: {
          // OUTSTR register
          let register = this.fetch(), value = this.readRegister(register), chr = String.fromCharCode(value);
          info.args = [register];
          if (this.executionConfig.commentary) {
            info.text = `Output register ${this._registerOffsets[register]} as ASCII: ${chr} (0x${this.toHex(value)})`;
          }
          let output = `[STDOUT: register ${this._registerOffsets[register]}] >> ${chr}`;
          console.log(output);
          globalThis.alert(output);
          break;
        }
        case this.instructionSet.OUTSTR_ADDR: {
          // OUTSTR address
          let address = this.fetch();
          info.args = [address];
          let string = '';
          for (let addr = address; ; addr += this.numType.bytes) {
            let n = this.readMemory(addr);
            if (n === 0) break;
            string += String.fromCharCode(n);
          }
          let addrHex = this.toHex(address);
          if (this.executionConfig.commentary) {
            info.text = `Output memory as null-terminated string from address 0x${addrHex} - string of length ${string.length}`;
          }
          let output = `[STDOUT: address 0x${addrHex}] >> ${string}`;
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
            info.text = `Output memory as null-terminated string from address in register ${this._registerOffsets[registerPtr]} (0x${this.toHex(address)}) - string of length ${string.length}`;
          }
          let output = `[STDOUT: address 0x${this.toHex(address)}] >> ${string}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} * register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} * 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} * address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} * 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} * 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} * 0x${constantHex} = 0x${this.toHex(result)}`;
          }
          this.writeRegister(register1, result);
          break;
        }
        case this.instructionSet.MOD_REG: {
          // MOD register1 register2 register3
          const register1 = this.fetch(), register2 = this.fetch(), register3 = this.fetch();
          const register2val = this.readRegister(register2), register3val = this.readRegister(register3);
          const result = register2val % register3val;
          info.args = [register1, register2, register3];
          if (this.executionConfig.commentary) {
            info.text = `Store register ${this._registerOffsets[register2]} % register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} % 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
          }
          this.writeRegister(register1, result);
          break;
        }
        case this.instructionSet.MOD_ADDR: {
          // MOD register1 register2 address
          const register1 = this.fetch(), register2 = this.fetch(), address = this.fetch();
          const register2val = this.readRegister(register2), addressVal = this.readMemory(address);
          const result = register2val % addressVal;
          info.args = [register1, register2, address];
          if (this.executionConfig.commentary) {
            info.text = `Store register ${this._registerOffsets[register2]} * address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} % 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
          }
          this.writeRegister(register1, result);
          break;
        }
        case this.instructionSet.MOD_CONST: {
          // MOD register1 register2 constant
          const register1 = this.fetch(), register2 = this.fetch(), constant = this.fetch();
          const register2val = this.readRegister(register2);
          const result = register2val % constant;
          info.args = [register1, register2, constant];
          if (this.executionConfig.commentary) {
            const constantHex = this.toHex(constant);
            info.text = `Store register ${this._registerOffsets[register2]} % 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} % 0x${constantHex} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} / register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} / 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} / address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} / 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} / 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} / 0x${constantHex} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} ** register ${this._registerOffsets[register3]} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} ** 0x${this.toHex(register3val)} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} ** address 0x${hex(address)} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} ** 0x${this.toHex(addressVal)} = 0x${this.toHex(result)}`;
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
            info.text = `Store register ${this._registerOffsets[register2]} ** 0x${constantHex} in register ${this._registerOffsets[register1]}\n0x${this.toHex(register2val)} ** 0x${constantHex} = 0x${this.toHex(result)}`;
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
            info.text = `Caculate register sqrt(${this._registerOffsets[register]})\nsqrt(0x${this.toHex(registerVal)}) = 0x${this.toHex(result)}`;
          }
          this.writeRegister(register, result);
          break;
        }
        case this.instructionSet.CST_CONST: {
          // CST register constant
          const register = this.fetch(), constant = this.fetch();
          const dt = numberTypeMap[constant];
          if (dt === undefined) throw new Error(`[SIGABRT] PROGRAM CRASH - UNKNOWN TYPE FLAG ${constant}`);
          const registerVal = this.readRegister(register);
          info.args = [register];
          // CAST
          const castType = getNumTypeInfo(dt);
          const number = castNumber(registerVal, this.numType, castType);
          if (this.executionConfig.commentary) {
            info.text = `Cast register ${this._registerOffsets[register]} from type ${this.numType.type} (${numberTypeMap[this.numType.type]}) to ${castType.type} (${constant})\n0x${numberToString(this.numType, registerVal, 16)} => 0x${numberToString(this.numType, number, 16)}`;
          }
          this.writeRegister(register, number);
          break;
        }
        case this.instructionSet.PSH_CONST: {
          // PSH constant
          const constant = this.fetch();
          info.args = [constant];
          this.push(constant);
          if (this.executionConfig.commentary) {
            info.text = `Push constant 0x${this.toHex(constant)} to stack\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
          }
          break;
        }
        case this.instructionSet.PSH_REG: {
          // PSH register
          const register = this.fetch(), registerVal = this.readRegister(register);
          info.args = [registerVal];
          this.push(registerVal);
          if (this.executionConfig.commentary) {
            info.text = `Push register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)}) to stack\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
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
            info.text = `Pop value to register ${rSymbol}\n${rSymbol} = 0x${this.toHex(value)}`;
          }
          this.writeRegister(register, value);
          break;
        }
        case this.instructionSet.CAL_CONST: {
          // CAL constant
          const constant = this.fetch();
          info.args = [constant];
          this.pushFrame();
          this.writeRegister("ip", constant);
          if (this.executionConfig.commentary) {
            info.text = `Call subroutine @ 0x${this.toHex(constant)}\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
          }
          break;
        }
        case this.instructionSet.CAL_REG: {
          // CAL register
          const register = this.fetch();
          const registerVal = this.readRegister(register);
          info.args = [register];
          this.pushFrame();
          this.writeRegister("ip", registerVal);
          if (this.executionConfig.commentary) {
            info.text = `Call subroutine @ register ${this._registerOffsets[register]} (0x${this.toHex(registerVal)})\nSP = 0x${this.toHex(this.readRegister('sp'))}; FP = 0x${this.toHex(this.readRegister('fp'))}`;
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
        case this.instructionSet.SYSCALL_CONST: {
          // SYSCALL constant
          const constant = this.fetch();
          let ret;
          info.args = [constant];
          if (this.executionConfig.commentary) {
            info.text = `Invoke a system call with argument 0x${this.toHex(constant)}`;
            ret = this.syscall(constant);
            info.text += `\nReturn value: 0x${this.toHex(ret)} (in r1)`;
          } else {
            ret = this.syscall(constant);
          }
          this.writeRegister('r1', ret);
          break;
        }
        case this.instructionSet.SYSCALL_REG: {
          // SYSCALL register
          const register = this.fetch();
          const registerVal = this.readRegister(register);
          let ret;
          info.args = [register];
          if (this.executionConfig.commentary) {
            info.text = `Invoke a system call with argument 0x${this.toHex(registerVal)}`;
            ret = this.syscall(registerVal);
            info.text += `\nReturn value: 0x${this.toHex(ret)} (in r1)`;
          } else {
            ret = this.syscall(registerVal);
          }
          this.writeRegister('r1', ret);
          break;
        }
        case this.instructionSet.BRK: {
          // BRK
          if (this.executionConfig.commentary) {
            info.text = `<Breakpoint>`;
          }
          continueExec = false;
          break;
        }
        default:
          info.termination = true;
          this._throwUnknownOpcode(opcode);
      }
    }
    info.termination = !continueExec;
    return continueExec;
  }
}

export default ARMProcessorExtended;
