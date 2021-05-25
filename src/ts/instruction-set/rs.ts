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
    MOV_CONST_REG: {
        mnemonic: 'MOV',
        opcode: 0x13,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Move constant [constant] to [register]'
    },
    MOV_ADDR_REG: {
        mnemonic: 'MOV',
        opcode: 0x14,
        args: [AssemblerType.Register, AssemblerType.Address],
        desc: 'Move value at address [address] to [register]'
    },
    MOV_REG_ADDR: {
        mnemonic: 'MOV',
        opcode: 0x15,
        args: [AssemblerType.Address, AssemblerType.Register],
        desc: 'Move value in register [register] to [address]',
    },
    //#endregion

    // #region Maths (0x3-)
    ADD_REG: {
        mnemonic: 'ADD',
        opcode: 0x30,
        args: [AssemblerType.Register],
        desc: 'Add value in register [register] to accumulator',
    },
    ADD_CONST: {
        mnemonic: 'ADD',
        opcode: 0x31,
        args: [AssemblerType.Constant],
        desc: 'Add value [constant] to accumulator',
    },
    SUB_REG: {
        mnemonic: 'SUB',
        opcode: 0x32,
        args: [AssemblerType.Register],
        desc: 'Subtract value in register [register] from accumulator',
    },
    SUB_CONST: {
        mnemonic: 'SUB',
        opcode: 0x33,
        args: [AssemblerType.Constant],
        desc: 'Subtract value [constant] from accumulator',
    },
    MUL_REG: {
        mnemonic: 'MUL',
        opcode: 0x34,
        args: [AssemblerType.Register],
        desc: 'Multiply accumulator by value in register [register]',
    },
    MUL_CONST: {
        mnemonic: 'MUL',
        opcode: 0x35,
        args: [AssemblerType.Constant],
        desc: 'Multiply accumulator by [constant]',
    },
    DIV_REG: {
        mnemonic: 'DIV',
        opcode: 0x36,
        args: [AssemblerType.Register],
        desc: 'Divide accumulator by value in register [register]',
    },
    DIV_CONST: {
        mnemonic: 'DIV',
        opcode: 0x37,
        args: [AssemblerType.Constant],
        desc: 'Divide accumulator by [constant]',
    },
    EXP_REG: {
        mnemonic: 'EXP',
        opcode: 0x38,
        args: [AssemblerType.Register],
        desc: 'Raise accumulator to the power stored in register [register]',
    },
    EXP_CONST: {
        mnemonic: 'EXP',
        opcode: 0x39,
        args: [AssemblerType.Constant],
        desc: 'Raise accumulator to the power of [constant]',
    },
    SQRT: {
        mnemonic: 'SQRT',
        opcode: 0x3A,
        args: [],
        desc: 'Calculate square root of accumulator (same as EXP #0.5)',
    },
    INC: {
        mnemonic: 'INC',
        opcode: 0x3B,
        args: [AssemblerType.Register],
        desc: 'Increment (+1) register [register]'
    },
    DEC: {
        mnemonic: 'DEC',
        opcode: 0x3C,
        args: [AssemblerType.Register],
        desc: 'Decrement (-1) register [register]'
    },
    // #endregion

    HALT: {
        mnemonic: 'HALT',
        opcode: 0x7f,
        args: [],
        desc: 'Stop execution',
    },
};