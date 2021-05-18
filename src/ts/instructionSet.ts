import globals from "./globals";
import { AssemblerType, IInstructionSet } from "./types/Assembler";

// TODO: add "subset" regions, mapping address ranges to common meaning e.g. 0x1- to "memory managment"
//       make visible in instructionSet tab above the command table, and insert as new column for each command

/** For assembler; list every instruction */
export const instructionSet: IInstructionSet = {
  NULL: {
    mnemonic: "NULL",
    opcode: 0x0,
    args: [],
    desc: "Skips to next instruction (or acts as HALT is in safe mode)",
    isAQA: false,
  },

  // #region Memory Managment (0x1-)
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

  MOV_REG: {
    mnemonic: "MOV",
    opcode: 0x14,
    args: [AssemblerType.Register, AssemblerType.Register],
    desc: "Copy the value in [register2] to [register1]",
    isAQA: true,
  },
  MOV_ADDR: {
    mnemonic: "MOV",
    opcode: 0x15,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Copy the value at address [address] to [register]",
    isAQA: true,
  },
  MOV_CONST: {
    mnemonic: "MOV",
    opcode: 0x16,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: "Move value [constant] in to [register]",
    isAQA: true,
  },
  // #endregion

  // #region Maths (0x2-)
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
    opcode: 0x23,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] - [register3] and store in [register1]",
    isAQA: true,
  },
  SUB_ADDR: {
    mnemonic: "SUB",
    opcode: 0x24,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] - value at [address] and store in [register1]",
    isAQA: true,
  },
  SUB_CONST: {
    mnemonic: "SUB",
    opcode: 0x25,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] - [constant] and store in [register1]",
    isAQA: true,
  },
  // #endregion Maths

  // #region Bitwise Manipulation (0x4-)
  AND_REG: {
    mnemonic: 'AND',
    opcode: 0x40,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: '[register2] AND [register3] and store in [register1]',
    isAQA: true,
  },
  AND_ADDR: {
    mnemonic: 'AND',
    opcode: 0x41,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: '[register2] AND value at [address] and store in [register1]',
    isAQA: true,
  },
  AND_CONST: {
    mnemonic: 'AND',
    opcode: 0x42,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: '[register2] AND constant [constant] and store in [register1]',
    isAQA: true,
  },
  ORR_REG: {
    mnemonic: 'ORR',
    opcode: 0x43,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: '[register2] OR [register3] and store in [register1]',
    isAQA: true,
  },
  ORR_ADDR: {
    mnemonic: 'ORR',
    opcode: 0x44,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: '[register2] OR value at [address] and store in [register1]',
    isAQA: true,
  },
  ORR_CONST: {
    mnemonic: 'ORR',
    opcode: 0x45,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: '[register2] OR constant [constant] and store in [register1]',
    isAQA: true,
  },
  EOR_REG: {
    mnemonic: 'EOR',
    opcode: 0x46,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: '[register2] XOR [register3] and store in [register1]',
    isAQA: true,
  },
  EOR_ADDR: {
    mnemonic: 'EOR',
    opcode: 0x47,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: '[register2] XOR value at [address] and store in [register1]',
    isAQA: true,
  },
  EOR_CONST: {
    mnemonic: 'EOR',
    opcode: 0x48,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: '[register2] XOR constant [constant] and store in [register1]',
    isAQA: true,
  },
  MVN_REG: {
    mnemonic: 'MVN',
    opcode: 0x49,
    args: [AssemblerType.Register, AssemblerType.Register],
    desc: 'NOT [register2] and store in [register1]',
    isAQA: true,
  },
  MVN_ADDR: {
    mnemonic: 'MVN',
    opcode: 0x4A,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: 'NOT value at [address] and store in [register1]',
    isAQA: true,
  },
  MVN_CONST: {
    mnemonic: 'MVN',
    opcode: 0x4B,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: 'NOT constant [constant] and store in [register1]',
    isAQA: true,
  },
  // #endregion

  // #region IP Manipulation (0x6-)
  CMP_REG: {
    mnemonic: "CMP",
    opcode: 0x60,
    args: [AssemblerType.Register, AssemblerType.Register],
    desc: "Compare register [register1] to [register2]",
    isAQA: true,
  },
  CMP_ADDR: {
    mnemonic: "CMP",
    opcode: 0x61,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Compare register [register] to address [address]",
    isAQA: true,
  },
  CMP_CONST: {
    mnemonic: "CMP",
    opcode: 0x62,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: "Compare register [register1] to [constant]",
    isAQA: true,
  },
  // #endregion

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