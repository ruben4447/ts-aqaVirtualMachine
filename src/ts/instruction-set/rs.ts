import { AssemblerType, IInstructionSet } from "../types/Assembler";

export const instructionSet: IInstructionSet = {
    NOP: {
        mnemonic: 'NOP',
        opcode: 0x00,
        args: [],
        desc: 'No operation - skip or halt',
    },
    
    // #region Move commands (0x1-)
    MOV_REG_REG: {
        mnemonic: 'MOV',
        opcode: 0x10,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Copy contents of [register2] to [register1]'
    },
    MOV_REGPTR_REG: {
        mnemonic: "MOV",
        opcode: 0x11,
        args: [AssemblerType.RegisterPtr, AssemblerType.Register],
        desc: "Move value stored in register [register] to the address stored in [registerPtr]",
    },
    MOV_REG_REGPTR: {
        mnemonic: "MOV",
        opcode: 0x12,
        args: [AssemblerType.Register, AssemblerType.RegisterPtr],
        desc: "Move value stored at address in register [registerPtr] to register [register]",
    },
    MOV_REGPTR_REGPTR: {
        mnemonic: "MOV",
        opcode: 0x13,
        args: [AssemblerType.RegisterPtr, AssemblerType.RegisterPtr],
        desc: "Move value stored at address in register [registerPtr2] to the address stored in [registerPtr1]",
    },
    MOV_CONST_REG: {
        mnemonic: 'MOV',
        opcode: 0x14,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Move constant [constant] to [register]'
    },
    MOV_ADDR_REG: {
        mnemonic: 'MOV',
        opcode: 0x15,
        args: [AssemblerType.Register, AssemblerType.Address],
        desc: 'Move value at address [address] to [register]'
    },
    MOV_REG_ADDR: {
        mnemonic: 'MOV',
        opcode: 0x16,
        args: [AssemblerType.Address, AssemblerType.Register],
        desc: 'Move value in register [register] to [address]',
    },
    //#endregion

    HALT: {
        mnemonic: 'HALT',
        opcode: 0x7f,
        args: [],
        desc: 'Stop execution',
    },
};