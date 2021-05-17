import globals from "./globals";
import { AssemblerType, IInstructionSet } from "./types/Assembler";

/** For assembler; list every instruction */
export const instructionSet: IInstructionSet = {
  NULL: {
    mnemonic: "NULL",
    opcode: 0x0,
    args: [],
    desc: "Skips to next instruction (or acts as HALT is in safe mode)",
    isAQA: false,
  },

  LDR: {
    mnemonic: 'LDR',
    opcode: 0x10,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Load the value stored at [address] into register [register]",
    isAQA: true,
  },

  STR: {
    mnemonic: "STR",
    opcode: 0x11,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Store the value that is in register[register] to address [address]",
    isAQA: true,
  },

  ADD_REG: {
    mnemonic: "ADD",
    opcode: 0x20,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] + [register3] and store in [register1]",
    isAQA: true,
  },
  ADD_ADDR: {
    mnemonic: "ADD",
    opcode: 0x21,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] + value at [address] and store in [register1]",
    isAQA: true,
  },
  ADD_CONST: {
    mnemonic: "ADD",
    opcode: 0x22,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] + [constant] and store in [register1]",
    isAQA: true,
  },

  SUB_REG: {
    mnemonic: "SUB",
    opcode: 0x25,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] - [register3] and store in [register1]",
    isAQA: true,
  },
  SUB_ADDR: {
    mnemonic: "SUB",
    opcode: 0x26,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] - value at [address] and store in [register1]",
    isAQA: true,
  },
  SUB_CONST: {
    mnemonic: "SUB",
    opcode: 0x27,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] - [constant] and store in [register1]",
    isAQA: true,
  },

  MOV_REG: {
    mnemonic: "MOV",
    opcode: 0x15,
    args: [AssemblerType.Register, AssemblerType.Register],
    desc: "Copy the value in [register2] to [register1]",
    isAQA: true,
  },
  MOV_ADDR: {
    mnemonic: "MOV",
    opcode: 0x16,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Copy the value at address [address] to [register]",
    isAQA: true,
  },
  MOV_CONST: {
    mnemonic: "MOV",
    opcode: 0x17,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: "Move value [constant] in to [register]",
    isAQA: true,
  },

  HALT: {
    mnemonic: "HALT",
    opcode: 0x7f, // 0xff causes issues if using int8, as 0xff in int8 is -1
    args: [],
    desc: "Stop execution",
    isAQA: true,
  },
};

export default instructionSet;

globals.instructionSet = Object.freeze(instructionSet);