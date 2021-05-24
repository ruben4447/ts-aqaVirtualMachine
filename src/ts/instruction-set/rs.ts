import globals from "../globals";
import { AssemblerType, IInstructionSet } from "../types/Assembler";

export const instructionSet: IInstructionSet = {
    NOP: {
        mnemonic: 'NOP',
        opcode: 0x00,
        args: [],
        desc: 'No operation - skip or halt',
    },
    HALT: {
        mnemonic: 'HALT',
        opcode: 0x01,
        args: [],
        desc: 'Stop execution',
    },
};