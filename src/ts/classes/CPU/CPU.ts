import { IInstructionSet } from "../../types/Assembler";
import { CPUModel, createCPUExecutionConfigObject, ICPUConfiguration, ICPUExecutionConfig, ICPUInstructionSet, IExecuteRecord, IRegisterInfo, IReversedCPUInstructionSet, MemoryWriteCallback, RegisterWriteCallback } from "../../types/CPU";
import { INumberType, NumberType } from "../../types/general";
import { createRegister, generateCPUInstructionSet } from "../../utils/CPU";
import { getNumTypeInfo, numberToString, reverseKeyValues, numericTypeToObject } from "../../utils/general";

export class CPUError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class CPU {
  public static readonly defaultNumType: NumberType = 'float32';

  public readonly model: CPUModel = undefined; // NO MODEL
  public readonly instructionSet: ICPUInstructionSet;
  public registerMap: { [reg: string]: IRegisterInfo }; // Map register names to index positions
  public readonly memorySize: number;
  public readonly numType: INumberType;
  public executionConfig: ICPUExecutionConfig;
  public instructType: INumberType; // Data type of instructions
  public regType: INumberType; // Date type of registers
  public instructTypeSuffixes: boolean = false; // Do instructions first argument contain a type?
  public regStackPtr: string = 'sp'; // Name of register which contains stack pointer
  public regInstructionPtr: string = 'ip'; // Name of register which contains instruction pointer
  public regFramePtr: string = 'fp'; // Name of register which contains frame pointer

  protected reversedInstructionSet: IReversedCPUInstructionSet;
  protected __registers: ArrayBuffer;
  protected _registers: DataView;
  protected _preserveRegisters: string[]; // Array of registers to preserve. All should be preserve: true in registerMap.
  protected _registerOffsets: { [offset: number]: string }; // Map register offsets to their names
  protected __memory: ArrayBuffer;
  protected _memory: DataView;
  protected _callbackMemoryWrite: MemoryWriteCallback;
  protected _callbackRegisterWrite: RegisterWriteCallback;
  protected _stackFrameSize = 0; // Size (in bytes) of latest stack frame

  constructor(instructionSet: IInstructionSet, config: ICPUConfiguration, defaultNumType = CPU.defaultNumType) {
    this.instructionSet = generateCPUInstructionSet(instructionSet);
    this.reversedInstructionSet = reverseKeyValues(this.instructionSet);

    this.numType = getNumTypeInfo(config.numType ?? defaultNumType);
    this.instructType = this.numType;
    this.regType = this.numType;

    if (config.registerMap) {
      this.registerMap = config.registerMap;
    } else {
      this.registerMap = {};
      let roff = 0;
      this.registerMap[this.regInstructionPtr] = createRegister(0, 'int64', true, 'Instruction pointer (points to current instruction)');
      this.registerMap[this.regStackPtr] = createRegister(8, 'int64', false, 'Stack pointer (top of stack)');
      this.registerMap[this.regFramePtr] = createRegister(16, 'int64', false, 'Stack frame pointer (points to top of current stack frame)');
      roff = 24;
      for (let i = 0; i < 8; i++, roff += 8)
        this.registerMap['r' + i] = createRegister(roff, 'float64', true);
    }

    let regBytes = 0;
    for (let reg in this.registerMap) if (this.registerMap.hasOwnProperty(reg)) regBytes += numericTypeToObject[this.registerMap[reg].type].bytes;
    if (config.appendRegisterMap) {
      for (let reg in config.appendRegisterMap) {
        if (config.appendRegisterMap.hasOwnProperty(reg)) {
          this.registerMap[reg] = config.appendRegisterMap[reg];
          this.registerMap[reg].offset = regBytes;
          regBytes += numericTypeToObject[config.appendRegisterMap[reg].type].bytes;
        }
      }
    }

    this._updateRegisteCaches();
    this.__registers = new ArrayBuffer(regBytes);
    this._registers = new DataView(this.__registers);

    this.memorySize = config.memory || 0xFFFFFF; // 24-bits, 16MB
    this.__memory = new ArrayBuffer(this.memorySize);
    this._memory = new DataView(this.__memory);

    this.resetRegisters();
    this.executionConfig = createCPUExecutionConfigObject();
  }

  public getOpcode(mnemonic: string): number { return this.instructionSet[mnemonic]; }
  public getMnemonic(opcode: number): string { return this.reversedInstructionSet[opcode]; }

  // #region Registers
  /** Update this._preserveRegisters and this._registerOffsets */
  protected _updateRegisteCaches() {
    this._preserveRegisters = Object.entries(this.registerMap).filter(([reg, meta]) => meta.preserve).map(([reg, meta]) => reg);
    this._registerOffsets = Object.fromEntries(Object.entries(this.registerMap).map(([reg, meta]) => ([meta.offset, reg])));
  }

  /** Get register name from an offset */
  public registerFromOffset(offset: number) {
    return this._registerOffsets[offset];
  }

  /** Reset reisters to initial values */
  public resetRegisters() {
    this.writeRegister(this.regInstructionPtr, 0);
    this.writeRegister(this.regStackPtr, this.memorySize - 1); // Stack pointer
    this.writeRegister(this.regFramePtr, this.memorySize - 1); // Frame pointer
  }

  /** Read value of given register (of register at given byteOffset). */
  public readRegister(register: string | number): number {
    if (typeof register === 'number') register = this.registerFromOffset(register);
    if (!(register in this.registerMap)) throw new Error(`SIGABRT - Unknown register ${register} in READ operation`);
    const meta = this.registerMap[register];
    return this._registers[numericTypeToObject[meta.type].getMethod](meta.offset);
  }

  /** Write value to given register (if number, this is the registers' offset) */
  public writeRegister(register: string | number, value: number): number {
    if (typeof register === 'number') register = this.registerFromOffset(register);
    if (!(register in this.registerMap)) throw new Error(`SIGABRT - Unknown register ${register} in WRITE operation`);
    const meta = this.registerMap[register];
    if (typeof this._callbackRegisterWrite === 'function') this._callbackRegisterWrite(register, value, this);
    return this._registers[numericTypeToObject[meta.type].setMethod](meta.offset, value);
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

  /** Write ArrayBuffer of any length into memory, starting at said address (store uint8s) */
  public loadMemoryBytes(startAddress: number, bytes: ArrayBuffer): number {
    try {
      const view = new DataView(bytes);
      for (let i = 0; i < view.byteLength; i++) {
        this._memory.setUint8(startAddress + i, view.getUint8(i));
      }
      let endAddress = startAddress + view.byteLength;
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
  public push(value: number, numType?: INumberType) {
    numType = numType ?? this.numType;
    let spAddr = this.readRegister("sp");
    this.writeMemory(spAddr, value, numType);
    this.writeRegister("sp", spAddr - numType.bytes); // Stack grows DOWN
    this._stackFrameSize += numType.bytes;
  }

  // Pop value from stack
  public pop(numType?: INumberType): number {
    numType = numType ?? this.numType
    let nextSPAddr = this.readRegister("sp") + numType.bytes; // The SP points at the next empty pos; therefore we need to increment the pointer by <bytes> first to get the top value
    this.writeRegister("sp", nextSPAddr);
    this._stackFrameSize -= numType.bytes;
    return this.readMemory(nextSPAddr);
  }

  // Push stack frame
  public pushFrame() {
    // for (let i = 0; i < this._generalRegisters.length; i++) this.push(this.readRegister(this._generalRegisters[i])); // Store general purpose registers
    for (let i = 0; i < this._preserveRegisters.length; i++) {
      let rname = this._preserveRegisters[i];
      this.push(this.readRegister(rname), numericTypeToObject[this.registerMap[rname].type]);
    }

    this.push(this.readRegister(this.regInstructionPtr), numericTypeToObject[this.registerMap[this.regInstructionPtr].type]); // Instruction Pointer
    this.push(this._stackFrameSize + 1, numericTypeToObject["uint32"]); // Record stack frame size
    this.writeRegister(this.regFramePtr, this.readRegister(this.regStackPtr));
    this._stackFrameSize = 0;
  }

  // Pop stack frame
  public popFrame() {
    const fpAddr = this.readRegister(this.regFramePtr);
    this.writeRegister(this.regStackPtr, fpAddr);

    const sfs = this.pop(numericTypeToObject["uint32"]);
    this._stackFrameSize = sfs;

    // Pop all stored registers
    this.writeRegister(this.regInstructionPtr, this.pop(numericTypeToObject[this.registerMap[this.regInstructionPtr].type]));
    for (let i = this._preserveRegisters.length - 1; i >= 0; i--) {
      let rname = this._preserveRegisters[i];
      this.writeRegister(rname, this.pop(numericTypeToObject[this.registerMap[rname].type]));
    }
    // Pop subroutine args
    const argBytes = this.pop(numericTypeToObject["uint32"]);
    for (let i = 0; i < argBytes; i++) this.pop(numericTypeToObject["int8"]);
    // Reset frame pointer
    this.writeRegister(this.regFramePtr, fpAddr + sfs);
  }

  /** Get next word in memory, and increment IP */
  public fetch(numType?: INumberType): number {
    numType = numType ?? this.numType;
    const ip = this.readRegister(this.regInstructionPtr);
    const word = this.readMemory(ip, numType);
    this.writeRegister(this.regInstructionPtr, ip + numType.bytes);
    return word;
  }

  /** Execute command associated with <opcode>. Return continue execution? */
  public execute(opcode: number, info: IExecuteRecord): boolean {
    throw new Error(`#<CPU>.execute: requires overriding`);
  }

  /** One fetch-execute cycle. Return whether to continue or not. */
  public cycle(info: IExecuteRecord): boolean {
    const ip = this.readRegister(this.regInstructionPtr);
    info.ip = ip;
    try {
      let opcode: number;
      try {
        opcode = this.fetch(this.instructType);
      } catch (e) {
        const error = new Error(`cycle: cannot fetch ${this.instructType.type} instruction:\n${e}`);
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

  /** Add "realistic" registers to a CPU */
  setAdvRegisters() {
    const R = createRegister;
    let roff = 0;
    this.registerMap = {
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
      this.registerMap['xmm' + i] = R(roff, "float64", false);
    for (let i = 0; i <= 7; i++, roff += 8)
      this.registerMap['mm' + i] = R(roff, "float64", false);
    this.__registers = new ArrayBuffer(roff);
    this._registers = new DataView(this.__registers);
  }
}



export default CPU;
