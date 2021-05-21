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
  LDR_PTR: {
    mnemonic: 'LDR',
    opcode: 0x11,
    args: [AssemblerType.Register, AssemblerType.RegisterPtr],
    desc: "Load the value stored at the address in register [registerPtr] into register [register]",
    isAQA: false,
  },
  STR: {
    mnemonic: "STR",
    opcode: 0x12,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Store the value that is in register [register] to address [address]",
    isAQA: true,
  },
  STR_PTR: {
    mnemonic: "STR",
    opcode: 0x13,
    args: [AssemblerType.Register, AssemblerType.RegisterPtr],
    desc: "Store the value that is in register [register] to address in register [registerPtr]",
    isAQA: false,
  },

  MOV_REG_REG: {
    mnemonic: "MOV",
    opcode: 0x14,
    args: [AssemblerType.Register, AssemblerType.Register],
    desc: "Copy the value in [register2] to [register1]",
    isAQA: true,
  },
  MOV_ADDR_REG: {
    mnemonic: "MOV",
    opcode: 0x15,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Copy the value at address [address] to [register]",
    isAQA: true,
  },
  MOV_CONST_REG: {
    mnemonic: "MOV",
    opcode: 0x16,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: "Move value [constant] in to [register]",
    isAQA: true,
  },
  MOV_REGPTR_REG: {
    mnemonic: "MOV",
    opcode: 0x17,
    args: [AssemblerType.RegisterPtr, AssemblerType.Register],
    desc: "Move value stored in register [register] to the address stored in [registerPtr]",
    isAQA: false,
  },
  MOV_REGPTR_REGPTR: {
    mnemonic: "MOV",
    opcode: 0x18,
    args: [AssemblerType.RegisterPtr, AssemblerType.RegisterPtr],
    desc: "Move value stored at address in register [registerPtr2] to the address stored in [registerPtr1]",
    isAQA: false,
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

  MUL_REG: {
    mnemonic: "MUL",
    opcode: 0x26,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] * [register3] and store in [register1]",
    isAQA: false,
  },
  MUL_ADDR: {
    mnemonic: "MUL",
    opcode: 0x27,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] * value at [address] and store in [register1]",
    isAQA: false,
  },
  MUL_CONST: {
    mnemonic: "MUL",
    opcode: 0x28,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] * [constant] and store in [register1]",
    isAQA: false,
  },

  DIV_REG: {
    mnemonic: "DIV",
    opcode: 0x29,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] / [register3] and store in [register1]",
    isAQA: false,
  },
  DIV_ADDR: {
    mnemonic: "DIV",
    opcode: 0x2A,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] / value at [address] and store in [register1]",
    isAQA: false,
  },
  DIV_CONST: {
    mnemonic: "DIV",
    opcode: 0x2B,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] / [constant] and store in [register1]",
    isAQA: false,
  },

  EXP_REG: {
    mnemonic: "EXP",
    opcode: 0x2C,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: "[register2] ** [register3] and store in [register1]",
    isAQA: false,
  },
  EXP_ADDR: {
    mnemonic: "EXP",
    opcode: 0x2D,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: "[register2] ** value at [address] and store in [register1]",
    isAQA: false,
  },
  EXP_CONST: {
    mnemonic: "EXP",
    opcode: 0x2E,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: "[register2] ** [constant] and store in [register1]",
    isAQA: false,
  },
  // #endregion Maths

  // #region Bitwise Manipulation and Comparisons (0x4-, 0x5-)
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
  LSL_REG: {
    mnemonic: 'LSL',
    opcode: 0x4C,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: 'Left shift register [register2] << register [register3] bits and store in [register1]',
    isAQA: true,
  },
  LSL_ADDR: {
    mnemonic: 'LSL',
    opcode: 0x4D,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: 'Left shift register [register2] << value at address [address] bits and store in [register1]',
    isAQA: true,
  },
  LSL_CONST: {
    mnemonic: 'LSL',
    opcode: 0x4E,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: 'Left shift register [register2] << [constant] bits and store in [register1]',
    isAQA: true,
  },
  LSR_REG: {
    mnemonic: 'LSR',
    opcode: 0x50,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
    desc: 'Right shift register [register2] >> register [register3] bits and store in [register1]',
    isAQA: true,
  },
  LSR_ADDR: {
    mnemonic: 'LSR',
    opcode: 0x51,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
    desc: 'Left shift register [register2] >> value at address [address] bits and store in [register1]',
    isAQA: true,
  },
  LSR_CONST: {
    mnemonic: 'LSR',
    opcode: 0x52,
    args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
    desc: 'Left shift register [register2] >> [constant] bits and store in [register1]',
    isAQA: true,
  },
  CMP_REG: {
    mnemonic: "CMP",
    opcode: 0x53,
    args: [AssemblerType.Register, AssemblerType.Register],
    desc: "Compare register [register1] to [register2]",
    isAQA: true,
  },
  CMP_ADDR: {
    mnemonic: "CMP",
    opcode: 0x54,
    args: [AssemblerType.Register, AssemblerType.Address],
    desc: "Compare register [register] to address [address]",
    isAQA: true,
  },
  CMP_CONST: {
    mnemonic: "CMP",
    opcode: 0x55,
    args: [AssemblerType.Register, AssemblerType.Constant],
    desc: "Compare register [register1] to [constant]",
    isAQA: true,
  },
  // #endregion

  // #region IP Manipulation (0x6-)
  JMP_CONST: {
    mnemonic: "JMP",
    opcode: 0x60,
    args: [AssemblerType.Constant],
    desc: "Set instruction pointer to constant [constant]",
    isAQA: false,
  },
  JMP_REG: {
    mnemonic: "JMP",
    opcode: 0x61,
    args: [AssemblerType.Register],
    desc: "Set instruction pointer to register [register]",
    isAQA: false,
  },
  JEQ_CONST: {
    mnemonic: "JEQ",
    opcode: 0x62,
    args: [AssemblerType.Constant],
    desc: "Set instruction pointer to constant [constant] if comparison is 'Equal To'",
    isAQA: false,
  },
  JEQ_REG: {
    mnemonic: "JEQ",
    opcode: 0x63,
    args: [AssemblerType.Register],
    desc: "Set instruction pointer to register [register] if comparison is 'Equal To'",
    isAQA: false,
  },
  JNE_CONST: {
    mnemonic: "JNE",
    opcode: 0x64,
    args: [AssemblerType.Constant],
    desc: "Set instruction pointer to constant [constant] if comparison is 'Not Equal To'",
    isAQA: false,
  },
  JNE_REG: {
    mnemonic: "JNE",
    opcode: 0x65,
    args: [AssemblerType.Register],
    desc: "Set instruction pointer to register [register] if comparison is 'Not Equal To'",
    isAQA: false,
  },
  JLT_REG: {
    mnemonic: "JLT",
    opcode: 0x66,
    args: [AssemblerType.Register],
    desc: "Set instruction pointer to register [register] if comparison is 'Less Than'",
    isAQA: false,
  },
  JLT_CONST: {
    mnemonic: "JLT",
    opcode: 0x67,
    args: [AssemblerType.Constant],
    desc: "Set instruction pointer to constant [constant] if comparison is 'Less Than'",
    isAQA: false,
  },
  JGT_REG: {
    mnemonic: "JGT",
    opcode: 0x68,
    args: [AssemblerType.Register],
    desc: "Set instruction pointer to register [register] if comparison is 'Greater Than'",
    isAQA: false,
  },
  JGT_CONST: {
    mnemonic: "JGT",
    opcode: 0x69,
    args: [AssemblerType.Constant],
    desc: "Set instruction pointer to constant [constant] if comparison is 'Greater Than'",
    isAQA: false,
  },
  // These are translated later on to corresponding JMP commands
  B: {
    mnemonic: 'B',
    opcode: 0x6A,
    args: [AssemblerType.Label],
    desc: 'Unconditionally branch to [label]',
    isAQA: true,
  },
  BEQ: {
    mnemonic: 'BEQ',
    opcode: 0x6B,
    args: [AssemblerType.Label],
    desc: "Branch to [label] if comparison is 'equal to'",
    isAQA: true,
  },
  BNE: {
    mnemonic: 'BNE',
    opcode: 0x6C,
    args: [AssemblerType.Label],
    desc: "Branch to [label] if comparison is 'not equal to'",
    isAQA: true,
  },
  BLT: {
    mnemonic: 'BLT',
    opcode: 0x6D,
    args: [AssemblerType.Label],
    desc: "Branch to [label] if comparison is 'less than'",
    isAQA: true,
  },
  BGT: {
    mnemonic: 'BGT',
    opcode: 0x6E,
    args: [AssemblerType.Label],
    desc: "Branch to [label] if comparison is 'greater than'",
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