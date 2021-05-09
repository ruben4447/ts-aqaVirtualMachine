import type CPU from "../classes/CPU";

export interface ICPUInstructionSet {
  [instruction: string]: number; // Map instruction to opcode
}

export type MemoryWriteCallback = (startAddress: number, endAddress: number, cpu: CPU) => void;
export type RegisterWriteCallback = (index: number, value: number, cpu: CPU) => void;