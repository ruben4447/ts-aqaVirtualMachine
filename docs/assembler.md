## Instruction
This tells the control unit to do something.

All the CPUs instruction can be seen in the instruction set.

## Comments
Anything after `;` will be removed as a comment.

## Operands
These follow an instruction and are seperated by whitespace (a comma is optional)
*e.g. MOV r8, #5*

Operands take many forms:

### Constant
Any value prefixed by a `#` is constant.
SYNTAX: `#[base]<number>`
- **optional** `base` : base of number. May be one of the following:
  - `b` : binary (base 2)
  - `o` : octal (base 8)
  - `d` : decimal (base 10) **[DEFAULT]**
  - `x` : hexadecimal (base 16)
- `number` : the value of the constant. If decimal, value may contain a decimal point. Else, the value will be parsed as an integer.

### Register
A register is a single location to store datum in
SYNTAX: `<register>`
The registers depend in the Processor.

### Address
Points to a location in memory.

SYNTAX: `[base]<adderess>`.

### Label
May be declared as a 'marker' in a program.

May later be used by branch commands to move program flow to this label.

### Pointer
Prefixed by `*`.

- Register Pointer `*r1` : points to contents of register r1
  E.g. `MOV *r1, r2` copies the contents of r2 into the memory address stored in r1
  E.g. `LDR r1, *r2` loads the value stored at address in r2 to r1

### Character Literals
These may be used in place of constant value

SYNTAX: `'<character>'`, where `<character>` is any ascii characters. THe program will convert this to its ASCII code and substitute this as the constant value e.g, `MOV r1, 'A'` == `MOV r1, #65`

## Labels
These are markers defined in a program and can be branched to to allow control flow

SYNTAX: `<label_name>:` (note: must be on a single line)

The branching commands are `B, BEQ, BNE, BLT, BGT` and the syntax is `<branch_command> <label_name>`

If a label begins with a `.`, it is defines as local. When encountered, label is immediately replaced with the address of the label instead of cached and replaced in the second pass. This means that local labels may be used multiple times.

## Directives
SYNTAX: `.<directive> ...`

### `.bytes`
SYNTAX `.data <bytelist>`

Inserts `bytelist` (see `.data`) into memory at current address as `uint8`s

### `.data`
SYNTAX `.data <bytelist>`

`bytelist` is a comma-seperated sequence of bytes, including:
- Constants `0<base><digits>`
- Characters `'<character>'`
- Strings `"<character>[]"`

Inserts `bytelist` into memory at current address as process-typed words

### `.equ`
SYNTAX `.equ <name> <value>`

**`<value>` is not evaluated in any way**

Defines constant `name`. Assembler replaces all instances of `name` with un-processed `value`.

If `value` is equivalent to a register name, and the constant is defined before it is used, then the register offset is used and is type `<Register>`. Else, a constant is of type `<Constant>`.

### `.skip`
SYNTAX `.skip`

Assembler skips the next line.

### `.stop`
SYNTAX `.stop`

Halts the assembler. Everything processed up to this point is still kept.

## Constants
SYNTAX: `<name> equ <value>`

**`<value>` IS PROCESSED**, unlike `.equ`

Defines constant `name` with **processed** `value`. Assembler replaces all instances of `name` with this value.

All constants are interpreted in instructions as indirect addressing.

### Predefined Constants
- `$` contains address of start of line
- `WORD` contains byte-length of CPU word
- `REGS` contains number of registers