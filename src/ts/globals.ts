import type Assembler from "./classes/Assembler";
import type CPU from "./classes/CPU";
import type MemoryView from "./classes/MemoryView";
import type RegisterView from "./classes/RegisterView";
import type CustomScreen from "./classes/Screen";
import type Tabs from "./classes/Tabs";
import type { IAssemblerInstructionMap } from "./types/Assembler";
import type { ICPUInstructionSet } from "./types/CPU";
import type { ICodeTabProperties, IInstructionSetProperties, IMemoryTabProperties, IRunTabProperties } from "./types/Tabs";

interface IGlobals {
  cpu: CPU; // Main CPU
  assembler: Assembler; // Main assembler
  output: CustomScreen; // Main output console
  tabs: {
    _: Tabs; // Tab manager
    code: ICodeTabProperties;
    memory: IMemoryTabProperties;
    run: IRunTabProperties;
    instructionSet: IInstructionSetProperties;
  },
  memoryView: MemoryView;
  registerView: RegisterView;
  assemblerInstructionMap: IAssemblerInstructionMap;
  cpuInstructionSet: ICPUInstructionSet;
};

const globals: IGlobals = {
  cpu: undefined,
  assembler: undefined,
  output: undefined,
  tabs: {
    _: undefined,
    code: undefined,
    memory: undefined,
    run: undefined,
    instructionSet: undefined,
  },
  memoryView: undefined,
  registerView: undefined,
  assemblerInstructionMap: undefined,
  cpuInstructionSet: undefined,
};

globalThis.globals = globals;

export default globals;