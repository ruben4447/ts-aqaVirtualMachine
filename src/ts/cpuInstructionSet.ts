import globals from "./globals";
import { ICPUInstructionSet } from "./types/CPU";

export const cpuInstructionSet: ICPUInstructionSet = {
  NULL: 0x0,
  LDR: 0x10,
  STR: 0x11,
  HALT: 0xff,
};

globals.cpuInstructionSet = Object.freeze(cpuInstructionSet);