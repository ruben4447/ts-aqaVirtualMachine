import type CPU from "../classes/CPU/CPU";
import { NumberType } from "./general";

export interface ICPUInstructionSet {
  [instruction: string]: number; // Map instruction to opcode
}

export enum CPUModel {
  AQAARM = 'AQA ARM',
  AQAARMExt = 'AQA ARM Extended',
  RS = 'RS',
}

export interface IReversedCPUInstructionSet {
  [opcode: number]: string; // Map opcodes to instructions
}

/** Configuration for a CPU */
export interface ICPUConfiguration {
  numType?: NumberType; // What numerical type memory operates in
  memory?: number; // Memory size
  registerMap?: string[]; // Register map. The CPU will as the required registers if they aren't present
}

export type MemoryWriteCallback = (startAddress: number, endAddress: number, cpu: CPU) => void;
export type RegisterWriteCallback = (index: number, value: number, cpu: CPU) => void;

export interface IExecuteRecord {
  ip: number; // Instruction pointer value when command was run
  opcode: number; // Opcode
  args: number[]; // Array of arguments
  text: string;
  error?: Error;
  termination: boolean; // Terminate execution?
}

export function createExecuteRecordObject(): IExecuteRecord {
  return {
    ip: undefined,
    opcode: undefined,
    args: [],
    text: '',
    termination: false,
  };
}

export interface ICPUExecutionConfig {
  haltOnNull: boolean; // HALT execution on NULL?
  detail: boolean; // Show info of command feedback e.g. mnemonic, halt reason...
  commentary: boolean; // Provide text description of command
}

export function createCPUExecutionConfigObject(): ICPUExecutionConfig {
  return {
    haltOnNull: true,
    detail: true,
    commentary: true,
  };
}

// export interface IFlagMasks {
//   CF: 0x0001,
//   PF: 0x0002,
//   AF: 0x0004,
//   ZF: 0x0008,
//   SF: 0x0010,
//   OF: 0x0020,
// }