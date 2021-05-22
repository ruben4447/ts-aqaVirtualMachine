import { createCPUExecutionConfigObject, ICPUConfiguration, ICPUExecutionConfig, ICPUInstructionSet, IExecuteRecord, IReversedCPUInstructionSet, MemoryWriteCallback, RegisterWriteCallback } from "../types/CPU";
import { INumberType } from "../types/general";
import { arrayToBuffer, getNumTypeInfo, hex, numberToString, reverseKeyValues } from "../utils/general";
import { CMP, compare } from '../utils/CPU';

export class CPUError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CPU {
  public static readonly defaultRegisters: string[] = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12"];

  public readonly instructionSet: ICPUInstructionSet;
  private readonly reversedInstructionSet: IReversedCPUInstructionSet;
  public readonly registerMap: string[]; // Map register names to index positions
  private __registers: ArrayBuffer;
  private _registers: DataView;
  private _ip: number; // As the Instruction Pointer is needed so often, this stord the index of IP in the register ArrayBuffer
  public readonly memorySize: number;
  private __memory: ArrayBuffer;
  private _memory: DataView;
  public readonly numType: INumberType;
  private _callbackMemoryWrite: MemoryWriteCallback;
  private _callbackRegisterWrite: RegisterWriteCallback;
  public executionConfig: ICPUExecutionConfig;


  constructor(config: ICPUConfiguration) {
    this.instructionSet = config.instructionSet;
    this.reversedInstructionSet = reverseKeyValues(this.instructionSet);

    const numType = config.numType || 'float32';
    this.numType = getNumTypeInfo(numType);

    this.registerMap = config.registerMap || CPU.defaultRegisters;
    const requiredRegisters = ["ip", "cmp"]; // Instruction Pointer, Compare
    for (const requiredRegister of requiredRegisters)
      if (this.registerMap.indexOf(requiredRegister) === -1)
        this.registerMap.push(requiredRegister);

    this._ip = this.registerMap.indexOf("ip");
    this.__registers = new ArrayBuffer(this.registerMap.length * this.numType.bytes);
    this._registers = new DataView(this.__registers);

    this.memorySize = config.memory || 0xFFF;
    this.__memory = new ArrayBuffer(this.memorySize * this.numType.bytes);
    this._memory = new DataView(this.__memory);

    this.executionConfig = createCPUExecutionConfigObject();
  }

  public getOpcode(mnemonic: string): number { return this.instructionSet[mnemonic]; }
  public getMnemonic(opcode: number): string { return this.reversedInstructionSet[opcode]; }

  // #region Registers

  /** Get index of register in register array. Return NaN is does not exist. */
  public getRegisterIndexFromName(name: string): number {
    const index = this.registerMap.indexOf(name);
    return index == -1 ? NaN : index;
  }

  /** Read value of register at said index */
  public readRegister(register: number | string): number {
    let index = typeof register === 'string' ? this.registerMap.indexOf(register) : Math.floor(register);
    if (isNaN(index) || index === -1) throw new Error(`readRegister: invalid argument provided '${register}'`);
    return this._registers[this.numType.getMethod](index * this.numType.bytes);
  }

  /** Write value to register at said index */
  public writeRegister(register: number | string, value: number): void {
    let index = typeof register === 'string' ? this.registerMap.indexOf(register) : Math.floor(register);
    if (isNaN(index) || index === -1) throw new Error(`writeRegister: invalid argument provided '${register}'`);
    this._registers[this.numType.setMethod](index * this.numType.bytes, value);
    if (typeof this._callbackRegisterWrite === 'function') this._callbackRegisterWrite(index, value, this);
  }

  // #endregion

  // #region Memory
  /** Get memory size in bytes */
  public memorySizeBytes(): number { return this.memorySize * this.numType.bytes; }

  /** Is this a valid memory address? */
  public isValidAddress(address: number): boolean { return address >= 0 && address < this.memorySize; }

  /** Read from memory */
  public readMemory(address: number): number {
    // As the offset is in bytes, we need to jump a whole <bytes> bytes to jump over the data pieces
    try {
      return this._memory[this.numType.getMethod](address * this.numType.bytes);
    } catch (e) {
      throw new Error(`readMemory: unable to read from address 0x${address.toString(16)}:\n${e}`);
    }
  }

  /** Read from region of memory */
  public readMemoryRegion(startAddress: number, words: number): ArrayBuffer {
    const buffer = new ArrayBuffer(words * this.numType.bytes), view = new DataView(buffer);
    for (let offset = 0; offset < words; offset++) {
      const actualOffset = offset * this.numType.bytes;
      let value = this._memory[this.numType.getMethod](startAddress + actualOffset);
      view[this.numType.setMethod](actualOffset, value);
    }
    return buffer;
  }

  /** Write value to memory */
  public writeMemory(address: number, value: number): void {
    try {
      this._memory[this.numType.setMethod](address * this.numType.bytes, value);
    } catch (e) {
      throw new Error(`writeMemory: unable to write to address 0x${address.toString(16)} (value: 0x${value.toString(16)}):\n${e}`);
    }
    if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(address, address, this);
  }

  /** Write bytes to a single memory address. Return number this represents. */
  public writeMemoryBytes(address: number, bytes: ArrayBuffer): number {
    try {
      if (bytes.byteLength !== this.numType.bytes) throw new RangeError(`writeMemoryBytes: CPU type is ${this.numType.type} which requires ${this.numType.bytes} bytes; got ${bytes.byteLength} bytes`);
      const view = new DataView(bytes);
      let actualAddress = address * this.numType.bytes;
      for (let i = 0; i < view.byteLength; i++) {
        this._memory.setUint8(actualAddress + i, view.getUint8(i));
      }
      if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(address, address, this);
      return this._memory[this.numType.getMethod](actualAddress);
    } catch (e) {
      throw new Error(`writeMemoryBytes: unable to write ${bytes.byteLength} bytes to address 0x${address.toString(16)}:\n${e}`);
    }
  }

  /** Write ArrayBuffer of any length into memory, starting at said address. */
  public loadMemoryBytes(startAddress: number, bytes: ArrayBuffer): number {
    try {
      startAddress *= this.numType.bytes;
      const view = new DataView(bytes);
      for (let i = 0; i < view.byteLength; i++) {
        this._memory.setUint8(startAddress + i, view.getUint8(i));
      }
      let endAddress = startAddress + (view.byteLength / this.numType.bytes);
      if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(startAddress, endAddress, this);
      return endAddress;
    } catch (e) {
      throw new Error(`loadMemoryBytes: unable to write ${bytes.byteLength} bytes to memory starting at address 0x${startAddress.toString(16)}:\n${e}`);
    }
  }

  /** Set every memory address in range to specified value. */
  public writeMemoryBulk(start: number, end: number, value: number): void {
    try {
      for (let address = start; address < end; address++) {
        this._memory[this.numType.setMethod](address * this.numType.bytes, value);
      }
      if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(start, end, this);
    } catch (e) {
      throw new Error(`writeMemoryBulk: unable to write value 0x${value.toString(16)} to addresses ranging 0x${start.toString(16)} to 0x${end.toString(16)}:\n${e}`);
    }
  }
  //#endregion

  public onMemoryWrite(cb: MemoryWriteCallback): void {
    this._callbackMemoryWrite = cb;
  }

  public onRegisterWrite(cb: RegisterWriteCallback): void {
    this._callbackRegisterWrite = cb;
  }

  /** Transform number to hexadecimal in out numbering format */
  public toHex(n: number): string {
    return numberToString(this.numType, n, 16);
  }


  /** Get next word in memory, and increment IP */
  public fetch(): number {
    const ip = this.readRegister(this._ip);
    const word = this.readMemory(ip);
    this.writeRegister(this._ip, ip + 1);
    return word;
  }

  /** Execute command associated with <opcode>. Return continue execution? */
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

  /** One fetch-execute cycle. Return whether to continue or not. */
  public cycle(info: IExecuteRecord): boolean {
    const ip = this.readRegister(this._ip);
    info.ip = ip;
    try {
      let opcode: number;
      try {
        opcode = this.fetch();
      } catch (e) {
        const error = new Error(`cycle: cannot fetch next word in memory:\n${e}`);
        info.error = error;
        info.text = e.message;
        throw error;
      }
      info.opcode = opcode;

      let cont: boolean;
      try {
        cont = this.execute(opcode, info);
      } catch (e) {
        const error = new Error(`cycle: failed to execute opcode 0x${opcode.toString(16)}:\n${e}`);
        info.error = error;
        info.text = e.message;
        throw error;
      }
      return cont;
    } catch (e) {
      // this.writeRegister(this._ip, ip); // Reset instruction pointer
      info.termination = true;
      throw new Error(`cycle: failed to complete CPU cycle where ip = 0x${ip}:\n${e}`);
    }
  }
}

export default CPU;
