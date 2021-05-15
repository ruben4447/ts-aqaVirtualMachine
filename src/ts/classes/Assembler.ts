import CPU from "./CPU";
import { AssemblerType, AssemblyLineType, IAssemblerInstructionMap, IAssemblerToken, IAssemblyInstructionLine, IAssemblyLine } from "../types/Assembler";
import { INumberType } from "../types/general";
import { matchesTypeSignature } from "../utils/Assembler";
import { arrayToBuffer, getNumericBaseFromPrefix, underlineStringPortion } from "../utils/general";

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
  private _imap: IAssemblerInstructionMap;

  constructor(cpu: CPU, instructionMap: IAssemblerInstructionMap) {
    this._imap = instructionMap;
    this._cpu = cpu;
  }

  /** Is current string an instruction? */
  public isInstruction(string: string): boolean { return this._imap.hasOwnProperty(string.toUpperCase()); }

  /**
   * Parse assembly code string
   * @throws AssemblerError
   * @return Returns ArrayBuffer as bytes. Intended to be read as Float64 typed array
   */
  public parse(assembly: string, origin: string = "<anonymous>"): ArrayBuffer {
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
    try {
      nums = this._astToNums(ast);
    } catch (e) {
      if (e instanceof AssemblerError) {
        e.fileName = origin;
        e.insertMessage(`Fatal error whilst assembling AST:`);
      }
      throw e;
    }


    return arrayToBuffer(nums, this._cpu.numType);
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
        const parts = line.split(/\s+/g).map(x => x.replace(',', ''));

        // If instruction...
        if (this.isInstruction(parts[0])) {
          const instruction = parts.shift();
          const uinstruction = instruction.toUpperCase();
          const instructionLine: IAssemblyInstructionLine = { type: AssemblyLineType.Instruction, instruction: undefined, args: [], };
          try {
            this.parseInstruction(uinstruction, parts, instructionLine);
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
          // Check that instruction exists
          if (this._cpu.instructionSet.hasOwnProperty((<IAssemblyInstructionLine>line).instruction)) {
            nums.push(this._cpu.instructionSet[(<IAssemblyInstructionLine>line).instruction]); // Push opcode to nums array
            (<IAssemblyInstructionLine>line).args.forEach(arg => nums.push(arg.num));
          } else {
            let json = JSON.stringify(line);
            const error = new AssemblerError(`Cannot resolve instruction mnemonic '${(<IAssemblyInstructionLine>line).instruction}' to opcode`, `"instruction":"${(<IAssemblyInstructionLine>line).instruction}"`);
            error.setUnderlineString(json);
            throw error;
          }
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
  public parseInstruction(instruction: string, args: string[], line: IAssemblyInstructionLine): void {
    // Parse each argument
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.length == 0) continue;
      let obj = this.parseArgument(arg);
      if (obj.type == undefined) throw new AssemblerError('Syntax Error: \'' + arg + '\' (operand type cannot be determined)', arg);
      line.args.push(obj);
    }

    // Check if there is a sub-instruction with that signature
    for (let subinstruction in this._imap[instruction]) {
      if (this._imap[instruction].hasOwnProperty(subinstruction)) {
        const commandInfo = this._imap[instruction][subinstruction];
        if (matchesTypeSignature(line.args, commandInfo.args)) {
          line.instruction = subinstruction;
          break;
        } else {
          const arg_types = line.args.map(x => `<${AssemblerType[x.type]}>`).join(' ');
          const error = new AssemblerError(`${instruction}: cannot find overload which matches provided arguments:`, ``);
          error.appendMessage(`${instruction} ${arg_types}`);
          error.highlightWholeLine = true;
          throw error;
        }
      }
    }
  }

  /** Parse an argument string and return an information object */
  public parseArgument(argument: string): IAssemblerToken {
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
      const registerIndex = this._cpu.registerMap.indexOf(argument);
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

    return token;
  }
}

export default Assembler;