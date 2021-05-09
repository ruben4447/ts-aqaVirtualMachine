import type Assembler from "./classes/Assembler";
import type CPU from "./classes/CPU";
import type MemoryView from "./classes/MemoryView";
import type RegisterView from "./classes/RegisterView";
import type CustomScreen from "./classes/Screen";
import type Tabs from "./classes/Tabs";

interface IGlobals {
  cpu: CPU; // Main CPU
  assembler: Assembler; // Main assembler
  output: CustomScreen; // Main output console
  tabs: {
    _: Tabs; // Tab manager
    [name: string]: object, // Tabs and their properties
  },
  memoryView: MemoryView;
  registerView: RegisterView;
};

const globals: IGlobals = {
  cpu: undefined,
  assembler: undefined,
  output: undefined,
  tabs: {
    _: undefined,
  },
  memoryView: undefined,
  registerView: undefined,
};

globalThis.globals = globals;

export default globals;