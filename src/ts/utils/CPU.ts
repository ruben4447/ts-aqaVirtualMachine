import { IInstructionSet } from "../types/Assembler";
import { ICPUInstructionSet } from "../types/CPU";
import { createEnum, getNumTypeInfo, hex } from "./general";

/** Comparison results. Note, no negative numbers to support unsigned data types. */
export enum CMP {
  EQUAL_TO = 0x0,
  LESS_THAN = 0x1,
  GREATER_THAN = 0x2,
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

/** Map number types to their corresponding numbers */
export const numberTypeMap = createEnum({
  int8: 0,
  uint8: 1,
  int16: 2,
  uint16: 3,
  int32: 4,
  uint32: 5,
  int64: 6,
  uint64: 7,
  float32: 8,
  float64: 9,
});

export const numberTypeToObject = {};
for (let key in numberTypeMap) {
  if (numberTypeMap.hasOwnProperty(key) && isNaN(+key)) {
    numberTypeToObject[key] = getNumTypeInfo(key as any);
  }
}