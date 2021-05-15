/** A toke used by the assembler */
export interface IAssemblerToken {
  type: AssemblerType;
  value: string; // Original value
  num: number; // Numerical value
};

/** Type of operands */
export enum AssemblerType {
  Instruction,
  Address,
  Register,
  Constant,
};

/** Type of line in assembly AST */
export enum AssemblyLineType {
  Label,
  Instruction,
};

/** Interface describing Assembler instruction map */
export interface IAssemblerInstructionMap {
  [instruction: string]: IAssemblerInstructionInfo;
};

/** Interface describing a command e.g. ADD */
export interface IAssemblerInstructionInfo {
  [instruction: string]: {
    args: Array<AssemblerType>; // Argument types
    desc: string; // Description
    isAQA: boolean; // Is in the AQA instruction set?
  };
};

/** Describes a line of tokens in assembly */
export interface IAssemblyLine {
  type: AssemblyLineType;
}

/** Represent an assembly instruction line */
export interface IAssemblyInstructionLine extends IAssemblyLine {
  instruction: string;
  args: Array<IAssemblerToken>;
}

/** Represent an assembly label declaration line */
export interface IAssemblyLabelDeclarationLine extends IAssemblyLine {
  label: string;
}