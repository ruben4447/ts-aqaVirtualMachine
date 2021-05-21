## Instruction
This tells the control unit to do something.

All the CPUs instruction can be seen in the instruction set.

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

## Labels
These are markers defined in a program and can be branched to to allow control flow

SYNTAX: `<label_name>:` (note: must be on a single line)

The branching commands are `B, BEQ, BNE, BLT, BGT` and the syntax is `<branch_command> <label_name>`