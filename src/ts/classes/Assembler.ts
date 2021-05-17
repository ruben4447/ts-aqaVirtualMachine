import CPU from "./CPU";
import { AssemblerType, AssemblyLineType, IInstructionSet, IAssemblerToken, IAssemblyInstructionLine, IAssemblyLine } from "../types/Assembler";
import { INumberType } from "../types/general";
import { matchesTypeSignature } from "../utils/Assembler";
import { arrayToBuffer, getNumericBaseFromPrefix, hex, underlineStringPortion } from "../utils/general";
import { ICPUInstructionSet } from "../types/CPU";

export class AssemblerError extends Error {
  protected _messageStack: string[];
  private _errorSection: string; // Bit that caused the error
  private _errorString: string; // String in which the error occured
  private _errorPrefix: string = "";
  public highlightWholeLine: boolean = false;
  public fileName: string = '<anonymous>';
  public lineNumber = NaN;
  public columnNumber = NaN;

  constructor(primaryMessage: string, errorSection: string) {
    super("[AssemblerError]" + primaryMessage);
    this._messageStack = [primaryMessage];
    this._errorSection = errorSection;
    this.setUnderlineString(this._errorSection);
  }

  public setUnderlineString(string: string, prefix: string = undefined) {
    if (prefix == undefined) prefix = this._errorPrefix; else this._errorPrefix = prefix;
    this._errorString = string.toString();
    const i = this._errorString.indexOf(this._errorSection);
    this.columnNumber = i;
  }

  public getUnderlineString() {
    if (this.highlightWholeLine) {
      return underlineStringPortion(this._errorString, 0, this._errorString.length, this._errorPrefix);
    } else {
      return this.columnNumber === -1 ? this._errorString : underlineStringPortion(this._errorString, this.columnNumber, this._errorSection.length, this._errorPrefix);
    }
  }

  public getErrorMessage() {
    let message = `AssemblerError at ${this.fileName}:${this.lineNumber}:${this.columnNumber}\n` + this.getUnderlineString();
    let i = 0, pad = '  ';
    for (i = 0; i < this._messageStack.length; i++) {
      message += '\n' + pad.repeat(i) + this._messageStack[i];
    }
    return message;
  }

  public appendMessage(message: string) {
    this._messageStack.push(message);
    this.message = this.getErrorMessage();
    return this;
  }
  public insertMessage(message: string) {
    this._messageStack.unshift(message);
    this.message = this.getErrorMessage();
    return this;
  }
}

export class Assembler {
  private _cpu: CPU; // CPU we are assembling for
  private _imap: IInstructionSet;

  private _assembly: string;
  private _ast: IAssemblyLine[];
  private _bytes: ArrayBuffer;

  constructor(cpu: CPU, instructionMap: IInstructionSet) {
    this._imap = instructionMap;
    this._cpu = cpu;
  }

  public setAssemblyCode(code: string) {
    this._assembly = code;
    this._ast = undefined;
    this._bytes = undefined;
  }

  public getAssemblyCode(): string { return this._assembly; }
  public getAST(): IAssemblyLine[] | undefined { return this._ast; }
  public getBytes(): ArrayBuffer | undefined { return this._bytes; }

  /** Is current string an instruction? */
  private _isInstruction(string: string): boolean {
    for (let instruction in this._imap) {
      if (this._imap.hasOwnProperty(instruction)) {
        if (this._imap[instruction].mnemonic === string) return true;
      }
    }
    return false;
  }

  /**
   * Parse assembly code string
   * @throws AssemblerError
   * Results can be obtained via this.getAST() or this.getBytes()
   */
  public parse(assembly: string, origin: string = "<anonymous>"): void {
    let ast: IAssemblyLine[], nums: number[];
    try {
      ast = this._parseToAST(assembly);
    } catch (e) {
      if (e instanceof AssemblerError) {
        e.fileName = origin;
        e.insertMessage(`Fatal error whilst parsing ${origin}:`);
      }
      throw e;
    }
    this._ast = ast;

    try {
      nums = this._astToNums(ast);
    } catch (e) {
      if (e instanceof AssemblerError) {
        e.fileName = origin;
        e.insertMessage(`Fatal error whilst assembling AST:`);
      }
      throw e;
    }

    this._bytes = arrayToBuffer(nums, this._cpu.numType);
  }

  /**
   * Parse assembly string, return AST
   */
  private _parseToAST(assembly: string): IAssemblyLine[] {
    const ast: Array<IAssemblyLine> = [];

    const lines = assembly.split(/\r|\n|\r\n/g);
    for (let i = 0; i < lines.length; i++) {
      try {
        let line = lines[i].trim();
        line = line.replace(/'.*$/g, ''); // Remove comments
        if (line.length === 0) continue;
        const parts = line.replace(/,/g, ' ').split(/\s+/g).filter(x => x.length > 0);

        // If instruction...
        if (this._isInstruction(parts[0].toUpperCase())) {
          const instruction = parts.shift().toUpperCase();
          const uinstruction = instruction.toUpperCase();
          const instructionLine: IAssemblyInstructionLine = { type: AssemblyLineType.Instruction, instruction: undefined, opcode: NaN, args: [], };
          try {
            this._parseInstruction(uinstruction, parts, instructionLine);
          } catch (e) {
            if (e instanceof AssemblerError) {
              e.setUnderlineString(line);
              e.insertMessage(`Error whilst parsing instruction ${uinstruction}:`);
            }
            throw e;
          }
          ast.push(instructionLine);
        } else {
          const error = new AssemblerError(`Syntax Error: expected <instruction> or <label>, got '${parts[0]}'`, parts[0]);
          error.setUnderlineString(line);
          throw error;
        }
      } catch (e) {
        if (e instanceof AssemblerError) {
          e.setUnderlineString(lines[i], (i + 1) + ' | ');
          e.lineNumber = i + 1;
          e.insertMessage(`Error whilst parsing line ${i + 1}:`);
        }
        throw e;
      }
    }

    return ast;
  }

  /**
   * Parse AST, return number[] array of "bytes"
   */
  private _astToNums(ast: IAssemblyLine[]): number[] {
    const nums: number[] = [];

    for (let i = 0; i < ast.length; i++) {
      try {
        let line = ast[i];

        if (line.type === AssemblyLineType.Instruction) {
          const info = line as IAssemblyInstructionLine;
          nums.push(info.opcode); // Push opcode to nums array
          info.args.forEach(arg => nums.push(arg.num));
        } else {
          let json = JSON.stringify(line);
          const error = new AssemblerError(`Unknown token type '${line.type}'`, `"type":${line.type}`);
          error.setUnderlineString(json);
          throw error;
        }
      } catch (e) {
        if (e instanceof AssemblerError) {
          e.lineNumber = i;
          e.insertMessage(`Whilst traversing AST line ${i + 1}:`);
        }
        throw e;
      }
    }

    return nums;
  }

  /** Parse an instruction */
  private _parseInstruction(instruction: string, args: string[], line: IAssemblyInstructionLine): void {
    // Parse each argument
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.length == 0) continue;
      let obj = this._parseArgument(arg);
      if (obj.type == undefined) throw new AssemblerError('Syntax Error: \'' + arg + '\' (operand type cannot be determined)', arg);
      line.args.push(obj);
    }

    // Check if a suitable instruction exists
    for (let operation in this._imap) {
      const commandInfo = this._imap[operation];
      if (commandInfo.mnemonic === instruction && matchesTypeSignature(line.args, commandInfo.args)) {
        if (commandInfo.opcode == undefined || isNaN(commandInfo.opcode)) {
          throw new AssemblerError(`Cannot resolve variant ${operation} of ${instruction} to opcode`, instruction);
        } else {
          line.instruction = operation;
          line.opcode = commandInfo.opcode;
          break;
        }
      }
    }

    // If there was no match...
    if (line.instruction === undefined) {
      const arg_types = line.args.map(x => `<${AssemblerType[x.type]}>`).join(' ');
      const error = new AssemblerError(`${instruction}: cannot find overload which matches provided arguments:`, ``);
      error.appendMessage(`${instruction} ${arg_types}`);
      error.highlightWholeLine = true;
      throw error;
    }
  }

  /** Parse an argument string and return an information object */
  private _parseArgument(argument: string): IAssemblerToken {
    const token: IAssemblerToken = { type: undefined, value: argument, num: undefined, };

    if (argument.length > 1 && argument[0] == '#') {
      // Constant value?
      token.type = AssemblerType.Constant;
      const base = getNumericBaseFromPrefix(argument[1]);
      if (base == undefined) {
        token.num = +argument.slice(1); // No base; default of decimal
      } else {
        if (isNaN(base)) throw new AssemblerError(`Syntax Error: invalid numeric base flag '${argument[1]}'`, argument[1]); // Invalid base number
        token.num = base == undefined ? +argument.slice(1) : parseInt(argument.slice(2), base);
      }
    } else {
      const registerIndex = this._cpu.registerMap.indexOf(argument.toLowerCase());
      if (!isNaN(registerIndex) && registerIndex !== -1) {
        // Register
        token.type = AssemblerType.Register;
        token.num = registerIndex;
      } else {
        // Extract address from argument
        let base = getNumericBaseFromPrefix(argument[0]), addr: number;
        if (base === undefined) {
          addr = parseInt(argument); // No base
        } else {
          // If base is not recogised, assembler will fall back on 'unable to determine type'
          if (!isNaN(base)) addr = parseInt(argument.slice(1), base);
        }

        // Is it a valid number?
        if (!isNaN(addr)) {
          token.type = AssemblerType.Address;
          token.num = addr;
        }
      }
    }

    // if there is a number, and CPU operates on an integer typing...
    if (token.num !== undefined && this._cpu.numType.isInt) token.num = Math.floor(token.num);

    return token;
  }

  /** From instruction set, generate instruction SET for the CPU */
  public static generateCPUInstructionSet(instructionSet: IInstructionSet): ICPUInstructionSet {
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
}

export default Assembler;