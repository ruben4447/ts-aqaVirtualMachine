import { Assembler } from "./classes/Assembler";
import { AssemblerType, IAssemblerInstructionMap } from "./types/Assembler";

/** For assembler; list every instruction */
export const assemblerInstructionMap: IAssemblerInstructionMap = {
  NULL: {
    NULL: [], // Depending on #<CPU>.safeMode, either skip to next instruction or act as HALT
  },

  LDR: {
    LDR: [AssemblerType.Register, AssemblerType.Address], // Load the value stored at [address] into register [register]
  },

  STR: {
    STR: [AssemblerType.Register, AssemblerType.Address], // Store the value that is in register [register] to address [address]
  },

  ADD: {
    ADD_REG: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register], // [register2] + [register3] and store in [register1]
    ADD_ADDR: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address], // [register2] + value at [address] and store in [register1]
    ADD_CONST: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant], // [register2] + [constant] and store in [register1]
  },

  SUB: {
    SUB_REG: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register], // [register2] - [register3] and store in [register1]
    SUB_ADDR: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address], // [register2] - value at [address] and store in [register1]
    SUB_CONST: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant], // [register2] - [constant] and store in [register1]
  },

  MOV: {
    MOV_REG: [AssemblerType.Register, AssemblerType.Register], // Copy the value in [register2] to [register1]
    MOV_ADDR: [AssemblerType.Register, AssemblerType.Address], // Copy the value at address [address] to [register]
    MOV_CONST: [AssemblerType.Register, AssemblerType.Constant], // Move value [constant] in to [register]
  },

  HALT: {
    HALT: [], // Stop execution (return false from execute method)
  },
};