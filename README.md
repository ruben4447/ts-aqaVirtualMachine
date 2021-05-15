# ts-aqaVirtualMachine
Virtual machine based on the AQA instruction set and assembly language

## Main Features
- **AQA Assembly code compiler** - able to write AQA assembly code and compile this into machine code
- **Execute machine code** - able to load machine code into memory and execute this - either one instruction at a time, or continous until HALTed
- **View/edit memory and registers** - be able to view content of processor's memory and registers, and be able to edit these
- **Output** - have a virtual screen which the processor can output to (add custom commands to allow printing)

## Instruction Sets
Instruction sets list what commands may be used and map it to an opcode that the 'CPU' understands. 

There are two instruction sets that I use - one for the assembler (`src/ts/assemblerInstructionMap.ts`), which maps mnemonics to associated commands depending on their arguments, and one for the cpu (`src/ts/cpuInstructionSet.ts`), which simply maps instructions to their opcode.

I am to have a tab which lists this for help purposes

## CPU
The CPU has an ArrayBuffer for registers and for memory, having the ability to read and write from either of these.
Both memory and the registers depend on the CPUs *numerical type* - this is tored in `#<CPU>.numType` and is immutable. This dictates what format data is get/set from DataViews. This is settable during CPU construction and should not be changed (unexpected results may arise).
Writing to either memory or registers will trigger a respective callback. This callback will not influence the writing process.

**NB typed arrays are NOT used. Typed arrays have endianness which may get confusing when transferring between types and DataViews. As such, only DataViews and their get/set methods are used**

## Assembler
This takes AQA assembly code as an input and produces an ArrayBuffer of output bytes (this output depends on the CPUs numeric typing, stores in `#<CPU>.numType`)
Upon error, an `AssemblerError` will be thrown at the various stage, and be caught and rethrown up until the called method. The error is designed to provide maximum insight into what caused it, and as such is quite verbose (perhaps unecessarily in some cases).
