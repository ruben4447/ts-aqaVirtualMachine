import { AssemblerType, IInstructionSet } from "../types/Assembler";
import { instructionSet as aqaInstructionSet } from "./aqa-arm";

/** For assembler; list every instruction
 * This is an extension of AQA Arm, so naturally include every instruction from that instruction set first
*/
export const instructionSet: IInstructionSet = {
  ...aqaInstructionSet,

  // #region I/O
  INP: {
    mnemonic: "INP",
    opcode: 0x01,
    args: [AssemblerType.Register],
    desc: "Prompt for input, and load into register [register]",
    isAQA: false,
  },
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
  OUT: {
    mnemonic: "OUT",
    opcode: 0x05,
    args: [AssemblerType.Register],
    desc: "Output contents of register [register]",
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
  //#endregion

  //#region Maths
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
  //#endregion
};

export default instructionSet;