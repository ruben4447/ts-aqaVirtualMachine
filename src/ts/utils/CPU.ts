import { IInstructionSet } from "../types/Assembler";
import { ICPUInstructionSet, IRegisterInfo } from "../types/CPU";
import { NumberType } from "../types/general";
import { createEnum, getNumTypeInfo, hex } from "./general";

/** Comparison results. Note, no negative numbers to support unsigned data types. */
export enum CMP {
  EQUAL_TO = 0,
  LESS_THAN = 1,
  GREATER_THAN = 2,
}

export function compare(a: number, b: number): CMP {
  if (a == b) return CMP.EQUAL_TO;
  else if (a < b) return CMP.LESS_THAN;
  else if (a > b) return CMP.GREATER_THAN;
  else throw new Error(`Compare: How the fuck did we get here? We somehow denied all logic...`);
}

/** Generate CPUInstructionSet from InstructionSet */
export function generateCPUInstructionSet(instructionSet: IInstructionSet): ICPUInstructionSet {
  const data = {};
  const usedOpcodes: number[] = [];
  for (const instruction in instructionSet) {
    if (instructionSet.hasOwnProperty(instruction)) {
      const opcode = instructionSet[instruction].opcode;
      if (usedOpcodes.indexOf(opcode) === -1) {
        data[instruction] = opcode;
        usedOpcodes.push(opcode);
      } else {
        throw new Error(`Invalid instruction set: duplicate opcode present: 0x${hex(opcode)} (${instruction})`);
      }
    }
  }
  return data;
}

/** Create register object */
export const createRegister = (offset: number, type: NumberType, preserve: boolean, desc?: string): IRegisterInfo => ({ offset, type, preserve, desc });