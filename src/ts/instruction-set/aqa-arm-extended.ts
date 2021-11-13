import { AssemblerType, IInstructionSet } from "../types/Assembler";
import { instructionSet as aqaInstructionSet } from "./aqa-arm";

/** For assembler; list every instruction
 * This is an extension of AQA Arm, so naturally include every instruction from that instruction set first
*/
export const instructionSet: IInstructionSet = {
  ...aqaInstructionSet,

  // #region I/O
  INPSTR_ADDR: {
    mnemonic: "INPSTR",
    opcode: 0x02,
    args: [AssemblerType.Address],
    desc: "Prompt for string input, and load into memory starting at address [address]",
    isAQA: false,
  },
  INPSTR_PTR: {
    mnemonic: "INPSTR",
    opcode: 0x03,
    args: [AssemblerType.RegisterPtr],
    desc: "Prompt for string input, and load into memory starting at address stored in register [registerPtr]",
    isAQA: false,
  },
  INP: {
    mnemonic: "INP",
    opcode: 0x01,
    args: [AssemblerType.Register],
    desc: "Prompt for input, and load into register [register]",
    isAQA: false,
  },
  OUTSTR_REG: {
    mnemonic: "OUTSTR",
    opcode: 0x06,
    args: [AssemblerType.Register],
    desc: "Output contents of register [register] as ASCII",
    isAQA: false,
  },
  OUTSTR_ADDR: {
    mnemonic: "OUTSTR",
    opcode: 0x07,
    args: [AssemblerType.Address],
    desc: "Output memory from address [address] as a null-terminates string",
    isAQA: false,
  },
  OUTSTR_PTR: {
    mnemonic: "OUTSTR",
    opcode: 0x08,
    args: [AssemblerType.RegisterPtr],
    desc: "Output memory from address in register [registerPtr] as a null-terminates string",
  },
  OUT: {
    mnemonic: "OUT",
    opcode: 0x05,
    args: [AssemblerType.Register],
    desc: "Output contents of register [register]",
    isAQA: false,
  },
  //#endregion

  //#region Maths
  MOD_REG: {
    mnemonic: "MOD",
    opcode: 0x1A,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] % [register3] and store in [register1]",
  },
  MOD_ADDR: {
    mnemonic: "MOD",
    opcode: 0x1B,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] % value at [address] and store in [register1]",
  },
  MOD_CONST: {
    mnemonic: "MOD",
    opcode: 0x1C,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] % [const] and store in [register1]",
  },
  MUL_REG: {
    mnemonic: "MUL",
    opcode: 0x26,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] * [register3] and store in [register1]",
  },
  MUL_ADDR: {
    mnemonic: "MUL",
    opcode: 0x27,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] * value at [address] and store in [register1]",
  },
  MUL_CONST: {
    mnemonic: "MUL",
    opcode: 0x28,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] * [constant] and store in [register1]",
  },

  DIV_REG: {
    mnemonic: "DIV",
    opcode: 0x29,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] / [register3] and store in [register1]",
  },
  DIV_ADDR: {
    mnemonic: "DIV",
    opcode: 0x2A,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] / value at [address] and store in [register1]",
  },
  DIV_CONST: {
    mnemonic: "DIV",
    opcode: 0x2B,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] / [constant] and store in [register1]",
  },

  EXP_REG: {
    mnemonic: "EXP",
    opcode: 0x2C,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] ** [register3] and store in [register1]",
  },
  EXP_ADDR: {
    mnemonic: "EXP",
    opcode: 0x2D,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] ** value at [address] and store in [register1]",
  },
  EXP_CONST: {
    mnemonic: "EXP",
    opcode: 0x2E,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] ** [constant] and store in [register1]",
  },
  SQRT_REG: {
    mnemonic: 'SQRT',
    opcode: 0x2F,
    args: [AssemblerType.Register],
    desc: "Calculate square root of [register] and store in [register]",
  },
  //#endregion

  //#region Memory Managment
  LDR_PTR: {
    mnemonic: 'LDR',
    opcode: 0x15,
    args: [AssemblerType.Register, AssemblerType.RegisterPtr],
    desc: "Load the value stored at the address in register [registerPtr] into register [register]",
  },
  STR_PTR: {
    mnemonic: "STR",
    opcode: 0x16,
    args: [AssemblerType.Register, AssemblerType.RegisterPtr],
    desc: "Store the value that is in register [register] to address in register [registerPtr]",
  },
  MOV_REGPTR_REG: {
    mnemonic: "MOV",
    opcode: 0x17,
    args: [AssemblerType.RegisterPtr, AssemblerType.Register],
    desc: "Move value stored in register [register] to the address stored in [registerPtr]",
  },

  CST_CONST: {
    mnemonic: "CST",
    opcode: 0x19,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: "Cast value in [register] to data type represented by [constant]",
  },
  //#endregion

  //#region Stack
  PSH_CONST: {
    mnemonic: "PSH",
    opcode: 0x30,
    args: [AssemblerType.Constant],
    desc: "Push [constant] to stack",
  },
  PSH_REG: {
    mnemonic: "PSH",
    opcode: 0x31,
    args: [AssemblerType.Register],
    desc: "Push register [register] to stack",
  },
  POP: {
    mnemonic: "POP",
    opcode: 0x32,
    args: [AssemblerType.Register],
    desc: "Pop value from stack and store in [register]",
  },
  CAL_CONST: {
    mnemonic: "CAL",
    opcode: 0x33,
    args: [AssemblerType.Constant],
    desc: "Call subroutine at memory address [constant] (NB number of arguments MUST be pushed before CAL)",
  },
  CAL_REG: {
    mnemonic: "CAL",
    opcode: 0x34,
    args: [AssemblerType.Register],
    desc: "Call subroutine at register [register] (NB number of arguments MUST be pushed before CAL)",
  },
  RET: {
    mnemonic: "RET",
    opcode: 0x35,
    args: [],
    desc: "Return from subroutine (used after CAL)",
  },
  //#endregion

  BRK: {
    mnemonic: "BRK",
    opcode: 0x7E,
    args: [],
    desc: "BREAKPOINT",
  },
};

export default instructionSet;