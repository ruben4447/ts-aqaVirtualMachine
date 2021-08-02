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
    ADD_REG_REG: {
        mnemonic: 'ADD',
        opcode: 0x30,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Store register1 + register2 in acc',
    },
    ADD_REG_CONST: {
        mnemonic: 'ADD',
        opcode: 0x31,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Store register + constant in acc',
    },
    SUB_REG_REG: {
        mnemonic: 'SUB',
        opcode: 0x32,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Store register1 - register2 in acc',
    },
    SUB_REG_CONST: {
        mnemonic: 'SUB',
        opcode: 0x33,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Store register - constant in acc',
    },
    MUL_REG_REG: {
        mnemonic: 'MUL',
        opcode: 0x34,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Store register1 * register2 in acc',
    },
    MUL_REG_CONST: {
        mnemonic: 'MUL',
        opcode: 0x35,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Store register * constant in acc',
    },
    DIV_REG_REG: {
        mnemonic: 'DIV',
        opcode: 0x36,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Store register1 / register2 in acc',
    },
    DIV_REG_CONST: {
        mnemonic: 'DIV',
        opcode: 0x37,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Store register1 / constant in acc',
    },
    IDIV_REG_REG: {
        mnemonic: 'IDIV',
        opcode: 0x38,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Store integer (register1 / register2) in acc',
    },
    IDIV_REG_CONST: {
        mnemonic: 'IDIV',
        opcode: 0x39,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Store integer (register1 / constant) in acc',
    },
    EXP_REG_REG: {
        mnemonic: 'EXP',
        opcode: 0x3A,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Store pow(register1, register2) in acc',
    },
    EXP_REG_CONST: {
        mnemonic: 'EXP',
        opcode: 0x3B,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Store pow(register, constant) in acc',
    },
    SQRT: {
        mnemonic: 'SQRT',
        opcode: 0x3C,
        args: [],
        desc: 'Calculate square root of acc',
    },
    INC: {
        mnemonic: 'INC',
        opcode: 0x3D,
        args: [AssemblerType.Register],
        desc: 'Increment (+1) register [register]'
    },
    DEC: {
        mnemonic: 'DEC',
        opcode: 0x3E,
        args: [AssemblerType.Register],
        desc: 'Decrement (-1) register [register]'
    },
    // #endregion

    //#region Bitwise
    AND_REG_REG: {
        mnemonic: 'AND',
        opcode: 0x40,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Bitwise and between two registers and place in acc',
    },
    AND_REG_CONST: {
        mnemonic: 'AND',
        opcode: 0x41,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Bitwise and [register] and [constant] and place in acc',
    },
    OR_REG_REG: {
        mnemonic: 'OR',
        opcode: 0x42,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Bitwise or between two registers and place in acc',
    },
    OR_REG_CONST: {
        mnemonic: 'OR',
        opcode: 0x43,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Bitwise or [register] and [constant] and place in acc',
    },
    XOR_REG_REG: {
        mnemonic: 'XOR',
        opcode: 0x44,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Bitwise xor between two registers and place in acc',
    },
    XOR_REG_CONST: {
        mnemonic: 'XOR',
        opcode: 0x45,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Bitwise xor [register] and [constant] and place in acc',
    },
    NOT: {
        mnemonic: 'NOT',
        opcode: 0x46,
        args: [AssemblerType.Register],
        desc: 'Bitwise not register [register',
    },
    LSF_REG_REG: {
        mnemonic: 'LSF',
        opcode: 0x47,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Left shift [register1] by [register2]',
    },
    LSF_REG_CONST: {
        mnemonic: 'LSF',
        opcode: 0x48,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Left shift [register1] by [constant]',
    },
    RSF_REG_REG: {
        mnemonic: 'RSF',
        opcode: 0x49,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: 'Right shift [register1] by [register2]',
    },
    RSF_REG_CONST: {
        mnemonic: 'RSF',
        opcode: 0x4A,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: 'Right shift [register1] by [constant]',
    },
    //#endregion

    //#region Conditions
    CMP_REG_REG: {
        mnemonic: "CMP",
        opcode: 0x50,
        args: [AssemblerType.Register, AssemblerType.Register],
        desc: "Compare register [register1] to [register2]. Set flag in cmp register.",
        isAQA: true,
    },
    CMP_REG_CONST: {
        mnemonic: "CMP",
        opcode: 0x51,
        args: [AssemblerType.Register, AssemblerType.Constant],
        desc: "Compare register [register1] to [constant]. Set flag in cmp register.",
        isAQA: true,
    },
    JMP_CONST: {
        mnemonic: "JMP",
        opcode: 0x52,
        args: [AssemblerType.Constant],
        desc: "Set instruction pointer to constant [constant]",
        isAQA: false,
    },
    JMP_REG: {
        mnemonic: "JMP",
        opcode: 0x53,
        args: [AssemblerType.Register],
        desc: "Set instruction pointer to register [register]",
        isAQA: false,
    },
    JEQ_CONST: {
        mnemonic: "JEQ",
        opcode: 0x54,
        args: [AssemblerType.Constant],
        desc: "Set instruction pointer to constant [constant] if comparison is 'Equal To'",
        isAQA: false,
    },
    JEQ_REG: {
        mnemonic: "JEQ",
        opcode: 0x55,
        args: [AssemblerType.Register],
        desc: "Set instruction pointer to register [register] if comparison is 'Equal To'",
        isAQA: false,
    },
    JNE_CONST: {
        mnemonic: "JNE",
        opcode: 0x56,
        args: [AssemblerType.Constant],
        desc: "Set instruction pointer to constant [constant] if comparison is 'Not Equal To'",
        isAQA: false,
    },
    JNE_REG: {
        mnemonic: "JNE",
        opcode: 0x57,
        args: [AssemblerType.Register],
        desc: "Set instruction pointer to register [register] if comparison is 'Not Equal To'",
        isAQA: false,
    },
    JLT_REG: {
        mnemonic: "JLT",
        opcode: 0x58,
        args: [AssemblerType.Register],
        desc: "Set instruction pointer to register [register] if comparison is 'Less Than'",
        isAQA: false,
    },
    JLT_CONST: {
        mnemonic: "JLT",
        opcode: 0x59,
        args: [AssemblerType.Constant],
        desc: "Set instruction pointer to constant [constant] if comparison is 'Less Than'",
        isAQA: false,
    },
    JGT_REG: {
        mnemonic: "JGT",
        opcode: 0x5A,
        args: [AssemblerType.Register],
        desc: "Set instruction pointer to register [register] if comparison is 'Greater Than'",
        isAQA: false,
    },
    JGT_CONST: {
        mnemonic: "JGT",
        opcode: 0x5B,
        args: [AssemblerType.Constant],
        desc: "Set instruction pointer to constant [constant] if comparison is 'Greater Than'",
        isAQA: false,
    },
    //#endregion

    //#region Stack
    PUSH_CONST: {
        mnemonic: "PUSH",
        opcode: 0x60,
        args: [AssemblerType.Constant],
        desc: "Push [constant] to stack",
    },
    PUSH_REG: {
        mnemonic: "PUSH",
        opcode: 0x61,
        args: [AssemblerType.Register],
        desc: "Push register [register] to stack",
    },
    POP: {
        mnemonic: "POP",
        opcode: 0x62,
        args: [AssemblerType.Register],
        desc: "Pop value from stack and store in [register]",
    },
    CALL_CONST: {
        mnemonic: "CALL",
        opcode: 0x63,
        args: [AssemblerType.Constant],
        desc: "Call subroutine at memory address [constant] (NB number of arguments MUST be pushed before CAL)",
    },
    CALL_REG: {
        mnemonic: "CALL",
        opcode: 0x64,
        args: [AssemblerType.Register],
        desc: "Call subroutine at register [register] (NB number of arguments MUST be pushed before CAL)",
    },
    RET: {
        mnemonic: "RET",
        opcode: 0x65,
        args: [],
        desc: "Return from subroutine (used after CAL)",
    },
    //#endregion

    BRK: {
        mnemonic: 'BRK',
        opcode: 0x7e,
        args: [],
        desc: 'Pause execution',
    },
    HALT: {
        mnemonic: 'HLT',
        opcode: 0x7f,
        args: [],
        desc: 'Stop execution',
    },
};