import { NumberType } from "./general";

/** A toke used by the assembler */
export interface IAssemblerToken {
  type: AssemblerType;
  value: string; // Original value
  num: number; // Numerical value
  ntype?: NumberType; // Data type of tokens 'num'. If not value, processors default is used
};

/** Type of operands */
export enum AssemblerType {
  Instruction,
  Address,
  Register,
  Constant,
  Symbol, // Like a variable or label
  RegisterPtr,
};

/** Type of line in assembly AST */
export enum AssemblyLineType {
  Instruction,
  Symbol,
  Data,
};

/** Interface describing Assembler instruction map */
export interface IInstructionSet {
  [instruction: string]: IInstructionInfo;
};

/** Interface describing a command e.g. ADD */
export interface IInstructionInfo {
  mnemonic: string; // Mnemonic this is represented by in assembly code
  opcode: number,
  args: Array<AssemblerType>; // Argument types
  desc: string; // Description
  isAQA?: boolean; // Is in the AQA instruction set? (for AQA-Arm)
  typeSuffix?: boolean; // Accept type suffix? e.g. <mnemonic>i32
};

/** Describes a line of tokens in assembly */
export interface IAssemblyLine {
  type: AssemblyLineType;
}

/** Represent an assembly instruction line */
export interface IAssemblyInstructionLine extends IAssemblyLine {
  instruction: string;
  ntype: NumberType;
  opcode: number;
  args: Array<IAssemblerToken>;
}

/** Represent an assembly symbol declaration line "<symbol>: ..." */
export interface IAssemblySymbolDeclarationLine extends IAssemblyLine {
  symbol: string;
}

/** Represent an assembly data declaration line */
export interface IAssemblyBytesDeclarationLine extends IAssemblyLine {
  data: ArrayBuffer;
}