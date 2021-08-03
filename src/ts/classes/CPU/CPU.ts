import { IInstructionSet } from "../../types/Assembler";
import { CPUModel, createCPUExecutionConfigObject, ICPUConfiguration, ICPUExecutionConfig, ICPUInstructionSet, IExecuteRecord, IReversedCPUInstructionSet, MemoryWriteCallback, RegisterWriteCallback } from "../../types/CPU";
import { INumberType, NumberType } from "../../types/general";
import { generateCPUInstructionSet } from "../../utils/CPU";
import { getNumTypeInfo, numberToString, reverseKeyValues } from "../../utils/general";

export class CPUError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CPU {
  public static readonly defaultRegisters: string[] = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
  public static readonly defaultNumType: NumberType = 'float32';
  public static readonly requiredRegisters: string[] = ["ip", "sp", "fp"];

  protected readonly _generalRegisters: string[];
  public readonly model: CPUModel = undefined; // NO MODEL
  public readonly instructionSet: ICPUInstructionSet;
  protected readonly reversedInstructionSet: IReversedCPUInstructionSet;
  public readonly registerMap: string[]; // Map register names to index positions
  protected readonly __registers: ArrayBuffer;
  protected readonly _registers: DataView;
  protected readonly _ip: number; // As the Instruction Pointer is needed so often, this stord the index of IP in the register ArrayBuffer
  public readonly memorySize: number;
  protected readonly __memory: ArrayBuffer;
  protected readonly _memory: DataView;
  public readonly numType: INumberType;
  protected _callbackMemoryWrite: MemoryWriteCallback;
  protected _callbackRegisterWrite: RegisterWriteCallback;
  protected _stackFrameSize = 0; // Size (in bytes) of latest stack frame
  public executionConfig: ICPUExecutionConfig;
  public displayDT: NumberType; // MemoryView


  constructor(instructionSet: IInstructionSet, config: ICPUConfiguration, defaultRegisters = CPU.defaultRegisters, defaultNumType = CPU.defaultNumType, requiredRegisters = []) {
    this.instructionSet = generateCPUInstructionSet(instructionSet);
    this.reversedInstructionSet = reverseKeyValues(this.instructionSet);

    this.numType = getNumTypeInfo(config.numType ?? defaultNumType);
    this.displayDT = "int8"; // this.numType.type;

    this.registerMap = config.registerMap || defaultRegisters;
    requiredRegisters = Array.from(new Set(CPU.requiredRegisters.concat(requiredRegisters)));
    for (const requiredRegister of requiredRegisters)
      if (this.registerMap.indexOf(requiredRegister) === -1)
        this.registerMap.push(requiredRegister);
    this._generalRegisters = this.registerMap.filter(r => r[0] === 'r');

    this._ip = this.registerMap.indexOf("ip");
    this.__registers = new ArrayBuffer(this.registerMap.length * this.numType.bytes);
    this._registers = new DataView(this.__registers);

    this.memorySize = config.memory || 0xFFF;
    this.__memory = new ArrayBuffer(this.memorySize * this.numType.bytes);
    this._memory = new DataView(this.__memory);

    this.resetRegisters();
    this.executionConfig = createCPUExecutionConfigObject();
  }

  public getOpcode(mnemonic: string): number { return this.instructionSet[mnemonic]; }
  public getMnemonic(opcode: number): string { return this.reversedInstructionSet[opcode]; }

  // #region Registers
  /** Reset reisters to initial values */
  resetRegisters() {
    this.writeRegister("ip", 0);
    this.writeRegister('sp', this.memorySize - 1); // Stack pointer
    this.writeRegister('fp', this.memorySize - 1); // Frame pointer
  }

  /** Get index of register in register array. Return NaN is does not exist. */
  public getRegisterIndexFromName(name: string): number {
    const index = this.registerMap.indexOf(name);
    return index == -1 ? NaN : index;
  }

  /** Read value of register at said index. Register index is always multiplied by this.numType. */
  public readRegister(register: number | string, numType?: INumberType): number {
    numType = numType ?? this.numType;
    let index = typeof register === 'string' ? this.registerMap.indexOf(register) : Math.floor(register);
    if (isNaN(index) || index === -1) throw new Error(`readRegister: invalid argument provided '${register}'`);
    return this._registers[numType.getMethod](index * this.numType.bytes);
  }
  
  /** Write value to register at said index */
  public writeRegister(register: number | string, value: number, numType?: INumberType): void {
    numType = numType ?? this.numType;
    let index = typeof register === 'string' ? this.registerMap.indexOf(register) : Math.floor(register);
    if (isNaN(index) || index === -1) throw new Error(`writeRegister: invalid argument provided '${register}'`);
    this._registers[numType.setMethod](index * this.numType.bytes, value);
    if (typeof this._callbackRegisterWrite === 'function') this._callbackRegisterWrite(index, value, this);
  }

  // #endregion

  // #region Memory
  /** Get memory size in bytes */
  public memorySizeBytes(): number { return this.memorySize * this.numType.bytes; }

  /** Is this a valid memory address? */
  public isValidAddress(address: number): boolean { return address >= 0 && address < this.memorySize; }

  /** Read from memory. Address is in BYTE chunks. */
  public readMemory(address: number, numType?: INumberType): number {
    if (numType === undefined) numType = this.numType;
    // As the offset is in bytes, we need to jump a whole <bytes> bytes to jump over the data pieces
    try {
      return this._memory[numType.getMethod](address);
    } catch (e) {
      throw new Error(`readMemory: unable to read from address 0x${address.toString(16)}:\n${e}`);
    }
  }

  /** Read from region of memory */
  public readMemoryRegion(startAddress: number, words: number, numType?: INumberType): ArrayBuffer {
    numType = numType ?? this.numType;
    const buffer = new ArrayBuffer(words * numType.bytes), view = new DataView(buffer);
    for (let offset = 0; offset < words; offset++) {
      const actualOffset = offset * numType.bytes;
      let value = this._memory[numType.getMethod](startAddress + actualOffset);
      view[numType.setMethod](actualOffset, value);
    }
    return buffer;
  }

  /** Write value to memory. Address is in BYTES. */
  public writeMemory(address: number, value: number, numType?: INumberType): void {
    numType = numType ?? this.numType;
    try {
      this._memory[numType.setMethod](address, value);
    } catch (e) {
      throw new Error(`writeMemory: unable to write to address 0x${address.toString(16)} (value: 0x${value.toString(16)}):\n${e}`);
    }
    if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(address, address + numType.bytes, this);
  }

  /** Write bytes to a single memory address. Return number this represents. */
  public writeMemoryBytes(address: number, bytes: ArrayBuffer, numType?: INumberType): number {
    numType = numType ?? this.numType;
    try {
      if (bytes.byteLength !== numType.bytes) throw new RangeError(`writeMemoryBytes: Date type is ${numType.type} which requires ${numType.bytes} bytes; got ${bytes.byteLength} bytes`);
      const view = new DataView(bytes);
      let actualAddress = address * numType.bytes;
      for (let i = 0; i < view.byteLength; i++) {
        this._memory.setUint8(actualAddress + i, view.getUint8(i));
      }
      if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(address, address + numType.bytes, this);
      return this._memory[numType.getMethod](actualAddress);
    } catch (e) {
      throw new Error(`writeMemoryBytes: unable to write ${bytes.byteLength} bytes to address 0x${address.toString(16)}:\n${e}`);
    }
  }

  /** Write ArrayBuffer of any length into memory, starting at said address. */
  public loadMemoryBytes(startAddress: number, bytes: ArrayBuffer, numType?: INumberType): number {
    numType = numType ?? this.numType;
    try {
      startAddress *= numType.bytes;
      const view = new DataView(bytes);
      for (let i = 0; i < view.byteLength; i++) {
        this._memory.setUint8(startAddress + i, view.getUint8(i));
      }
      let endAddress = startAddress + (view.byteLength / numType.bytes);
      if (typeof this._callbackMemoryWrite === 'function') this._callbackMemoryWrite(startAddress, endAddress, this);
      return endAddress;
    } catch (e) {
      throw new Error(`loadMemoryBytes: unable to write ${bytes.byteLength} bytes to memory starting at address 0x${startAddress.toString(16)}:\n${e}`);
    }
  }

  /** Set every memory address in range to specified value. */
  public writeMemoryBulk(start: number, end: number, value: number, numType?: INumberType): void {
    numType = numType ?? this.numType;
    try {
      for (let address = start; address < end; address++) {
        this._memory[numType.setMethod](address * numType.bytes, value);
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

  // Push value to the stack
  public push(value: number) {
    let spAddr = this.readRegister("sp");
    this.writeMemory(spAddr, value);
    this.writeRegister("sp", spAddr - 1); // Stack grows DOWN
    this._stackFrameSize += 1;
  }

  // Pop value from stack
  public pop(): number {
    let nextSPAddr = this.readRegister("sp") + 1; // The SP points at the next empty pos; therefore we need to increment the pointer by <bytes> first to get the top value
    this.writeRegister("sp", nextSPAddr);
    this._stackFrameSize -= 1;
    return this.readMemory(nextSPAddr);
  }

  // Push stack frame
  public pushFrame() {
    for (let i = 0; i < this._generalRegisters.length; i++) this.push(this.readRegister(this._generalRegisters[i])); // Store general purpose registers
    this.push(this.readRegister("ip"));
    this.push(this._stackFrameSize + 1); // Record stack frame size
    this.writeRegister("fp", this.readRegister("sp"));
    this._stackFrameSize = 0;
  }

  // Pop stack frame
  public popFrame() {
    const fpAddr = this.readRegister("fp");
    this.writeRegister("sp", fpAddr);

    const sfs = this.pop();
    this._stackFrameSize = sfs;

    // Pop all stored registers
    this.writeRegister("ip", this.pop());
    for (let i = this._generalRegisters.length - 1; i >= 0; i--) this.writeRegister(this._generalRegisters[i], this.pop());
    // Pop subroutine args
    console.log("BEFORE NARGS");
    const nArgs = this.pop();
    console.log("NARGS:", nArgs)
    for (let i = 0; i < nArgs; i++) this.pop();
    // Reset frame pointer
    this.writeRegister("fp", fpAddr + sfs);
  }

  /** Get next word in memory, and increment IP */
  public fetch(numType?: INumberType): number {
    numType = numType || this.numType;
    const ip = this.readRegister(this._ip, numType);
    const word = this.readMemory(ip, numType);
    this.writeRegister(this._ip, ip + numType.bytes);
    return word;
  }

  /** Execute command associated with <opcode>. Return continue execution? */
  public execute(opcode: number, info: IExecuteRecord): boolean {
    throw new Error(`#<CPU>.execute: requires overriding`);
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
        const error = new Error(`cycle: failed to execute instruction 0x${opcode.toString(16)}:\n${e}`);
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

  /** Throw error when opcode is unknown */
  _throwUnknownOpcode(opcode) {
    throw new Error(`[SIGILL] illegal instruction 0x${opcode.toString(16)}`);
  }
}

export default CPU;
