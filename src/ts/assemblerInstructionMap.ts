import globals from "./globals";
import { AssemblerType, IAssemblerInstructionMap } from "./types/Assembler";

/** For assembler; list every instruction */
export const assemblerInstructionMap: IAssemblerInstructionMap = {
  NULL: {
    NULL: {
      args: [],
      desc: "Skips to next instruction (or acts as HALT is in safe mode)",
      isAQA: false,
    }
  },

  LDR: {
    LDR: {
      args: [AssemblerType.Register, AssemblerType.Address],
      desc: "Load the value stored at [address] into register [register]",
      isAQA: true,
    },
  },

  STR: {
    STR: {
      args: [AssemblerType.Register, AssemblerType.Address],
      desc: "Store the value that is in register[register] to address [address]",
      isAQA: true,
    },
  },

  ADD: {
    ADD_REG: {
      args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
      desc: "[register2] + [register3] and store in [register1]",
      isAQA: true,
    },
    ADD_ADDR: {
      args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
      desc: "[register2] + value at [address] and store in [register1]",
      isAQA: true,
    },
    ADD_CONST: {
      args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
      desc: "[register2] + [constant] and store in [register1]",
      isAQA: true,
    },
  },

  SUB: {
    SUB_REG: {
      args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Register],
      desc: "[register2] - [register3] and store in [register1]",
      isAQA: true,
    },
    SUB_ADDR: {
      args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Address],
      desc: "[register2] - value at [address] and store in [register1]",
      isAQA: true,
    },
    SUB_CONST: {
      args: [AssemblerType.Register, AssemblerType.Register, AssemblerType.Constant],
      desc: "[register2] -[constant] and store in [register1]",
      isAQA: true,
    },
  },

  MOV: {
    MOV_REG: {
      args: [AssemblerType.Register, AssemblerType.Register],
      desc: "Copy the value in [register2] to [register1]",
      isAQA: true,
    },
    MOV_ADDR: {
      args: [AssemblerType.Register, AssemblerType.Address],
      desc: "Copy the value at address [address] to [register]",
      isAQA: true,
    },
    MOV_CONST: {
      args: [AssemblerType.Register, AssemblerType.Constant],
      desc: "Move value [constant] in to [register]",
      isAQA: true,
    },
  },

  HALT: {
    HALT: {
      args: [],
      desc: "Stop execution",
      isAQA: true,
    },
  },
};

globals.assemblerInstructionMap = Object.freeze(assemblerInstructionMap);