import CPU from "./CPU/CPU";
import { AssemblerType, AssemblyLineType, IInstructionSet, IAssemblerToken, IAssemblyInstructionLine, IAssemblyLine, IAssemblyLabelDeclarationLine } from "../types/Assembler";
import { isValidSymbol, label_regex, matchesTypeSignature } from "../utils/Assembler";
import { bufferToArray, getNumericBaseFromPrefix, numericTypesAbbr, underlineStringPortion, numericTypeToObject, numberTypeMap } from "../utils/general";
import { INumberType, NumberType } from "../types/general";

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
  private _labels: Map<string, number> = new Map();
  private _symbols: Map<string, string> = new Map();
  public startAddress = 0;
  public removeNOPs: boolean = false;

  constructor(cpu: CPU, instructionMap: IInstructionSet) {
    this._imap = instructionMap;
    this._cpu = cpu;
  }

  public setAssemblyCode(code: string) {
    this._assembly = code;
    this._ast = undefined;
    this._bytes = undefined;
    this._labels.clear();
    this._symbols.clear();
  }

  public getAssemblyCode(): string { return this._assembly; }
  public getAST(): IAssemblyLine[] | undefined { return this._ast; }
  public getBytes(): ArrayBuffer | undefined { return this._bytes; }
  public getLabels(): [string, number][] { return Array.from(this._labels.entries()); }
  public getSymbols(): [string, string][] { return Array.from(this._symbols.entries()); }
  public getLabel(label: string): number | undefined { return this._labels.get(label); }

  /**
   * Parse assembly code string
   * @throws AssemblerError
   * Results can be obtained via this.getAST() or this.getBytes()
   */
  public parse(assembly: string, origin: string = "<anonymous>"): void {
    let ast: IAssemblyLine[], buff: ArrayBuffer;
    this._labels.clear();
    this._symbols.clear();

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
      buff = this._astToBuffer(ast);
    } catch (e) {
      if (e instanceof AssemblerError) {
        e.fileName = origin;
        e.insertMessage(`Fatal error whilst assembling AST:`);
      }
      throw e;
    }

    this._bytes = buff;
  }

  /**
   * Parse assembly string, return AST.
   */
  private _parseToAST(assembly: string): IAssemblyLine[] {
    const ast: IAssemblyLine[] = [];

    const lines = assembly.split(/\r|\n|\r\n/g);
    for (let i = 0; i < lines.length; i++) {
      try {
        let line = lines[i].trim();
        line = line.replace(/;.*$/g, ''); // Remove comments
        if (line.length === 0) continue;
        const parts = line.replace(/,/g, ' ').split(/\s+/g).filter(x => x.length > 0);

        // If instruction...
        const iobj = this._getInstructionFromString(parts[0].toUpperCase());
        if (iobj !== null) {
          parts.shift();
          let uinstruction = iobj.instruction.toUpperCase();
          const instructionLine: IAssemblyInstructionLine = { type: AssemblyLineType.Instruction, ntype: iobj.ntype, instruction: undefined, opcode: NaN, args: [], };
          try {
            this._parseInstruction(uinstruction, parts, instructionLine);
          } catch (e) {
            if (e instanceof AssemblerError) {
              e.setUnderlineString(line);
              e.insertMessage(`Error whilst parsing instruction ${uinstruction}:`);
            }
            throw e;
          }
          if (this.removeNOPs && instructionLine.instruction === 'NOP') {
            // Do not add NOP instruction
          } else {
            ast.push(instructionLine);
          }
        } else if (parts[0][parts[0].length - 1] === ':') { // Label
          const label = parts[0].substr(0, parts[0].length - 1);
          if (parts.length === 1) {
            if (isValidSymbol(label)) {
              const labelLine: IAssemblyLabelDeclarationLine = { type: AssemblyLineType.Label, label, };
              ast.push(labelLine);
            } else {
              const error = new AssemblerError(`Syntax Error: invalid label; must match ${label_regex}`, label);
              error.setUnderlineString(line);
              throw error;
            }
          } else {
            const error = new AssemblerError(`Syntax Error: Expected newline after label declaration`, parts[1]);
            error.setUnderlineString(line);
            throw error;
          }
        } else if (parts[0][0] === '#') {
          let directive = parts[0].substr(1);

          if (directive === 'stop') { // Stop parsing
            break;
          } else if (directive === 'skip') { // Skip next line
            i++;
            continue;
          } else if (directive === 'define') {
            // Valid name?
            if (isValidSymbol(parts[1])) {
              // Already defined?
              if (this._symbols.has(parts[1])) {
                const error = new AssemblerError(`SYMBOL: '${parts[1]}' symbol redeclared`, parts[1]);
                error.setUnderlineString(line);
                throw error;
              } else {
                let string = line.substr("#define".length);
                string = string.substr(string.indexOf(parts[1]) + parts[1].length).trim();
                this._symbols.set(parts[1], string);
              }
            } else {
              const error = new AssemblerError(`Syntax Error: invalid syntax: expected symbol`, parts[1]);
              error.setUnderlineString(line);
              throw error;
            }
          } else {
            const error = new AssemblerError(`Syntax Error: unknown directive`, directive);
            error.setUnderlineString(line);
            throw error;
          }
        } else {
          const error = new AssemblerError(`Syntax Error: invalid syntax`, parts[0]);
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
   * Populate this._labels
   */
  private _astToBuffer(ast: IAssemblyLine[]): ArrayBuffer {
    let buff: ArrayBuffer, dv: DataView, bytes = 0;
    let address = this.startAddress; // Current address

    // Calculate byte length
    ast.forEach(line => {
      if (line.type === AssemblyLineType.Instruction) {
        bytes += this._cpu.instructType.bytes; // Instruction
        // console.log(`${line.instruction}: + ${this._cpu.instructType.bytes}`)
        if (this._cpu.instructTypeSuffixes && this._imap[line.instruction].typeSuffix) {
          // console.log(`${line.instruction}: + 1 (type)`)
          bytes++;
        }
        line.args.forEach(arg => {
          bytes += numericTypeToObject[arg.ntype]?.bytes ?? this._cpu.numType.bytes;
          // console.log(`${line.instruction}: arg: + ${numericTypeToObject[arg.ntype]?.bytes ?? this._cpu.numType.bytes}`, arg)
        });
      }
    });
    buff = new ArrayBuffer(bytes);
    dv = new DataView(buff);

    // Resolve label addresses
    for (let i = 0; i < ast.length; i++) {
      const line = ast[i];
      if (line.type === AssemblyLineType.Label) {
        this._labels.set((line as IAssemblyLabelDeclarationLine).label, address);
      } else if (line.type === AssemblyLineType.Instruction) {
        address += this._cpu.instructType.bytes;
        if (this._cpu.instructTypeSuffixes && this._imap[line.instruction].typeSuffix) bytes++;
        line.args.forEach(arg => {
          address += numericTypeToObject[arg.ntype].bytes;
        });
      }
    }

    // Resolve label names
    ast.forEach(line => {
      if (line.args) line.args.forEach((arg, i) => {
        if (arg.type === AssemblerType.Symbol) {
          arg.type = AssemblerType.Address;
          if (this._labels.has(arg.value)) arg.num = this._labels.get(arg.value);
          else throw new AssemblerError(`'${line.instruction}' operand ${i}: SYMBOL: Cannot find symbol '${arg.value}'`, arg.value);
        }
      });
    });

    let byteOffset = 0; // Byte offset into buffer
    for (let i = 0, typeObj: INumberType; i < ast.length; i++) {
      try {
        let line = ast[i];

        if (line.type === AssemblyLineType.Instruction) {
          const info = line as IAssemblyInstructionLine;
          typeObj = this._cpu.instructType;
          dv[typeObj.setMethod](byteOffset, info.opcode); // Add opcode to memory
          byteOffset += typeObj.bytes;

          if (this._cpu.instructTypeSuffixes && this._imap[line.instruction].typeSuffix) {
            dv.setUint8(byteOffset++, numberTypeMap[info.ntype]);
          }

          info.args.forEach(arg => {
            typeObj = numericTypeToObject[arg.ntype];
            dv[typeObj.setMethod](byteOffset, arg.num); // Add argument's numeric representation to memory
            byteOffset += typeObj.bytes;
          });
        } else if (line.type === AssemblyLineType.Label) { } else {
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

    return buff;
  }

  /** Parse an instruction */
  private _parseInstruction(instruction: string, args: string[], line: IAssemblyInstructionLine): void {
    // Parse each argument
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.length == 0) continue;
      let obj = this._parseArgument(arg, line.ntype);
      if (obj.ntype == undefined) obj.ntype = line.ntype;
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
  private _parseArgument(argument: string, instructionType: NumberType): IAssemblerToken {
    const token: IAssemblerToken = { type: undefined, value: argument, num: undefined, };
    let expandedSymbol;

    // Symbol?
    if (this._symbols.has(argument)) {
      expandedSymbol = argument;
      argument = this._symbols.get(argument);
    }

    // Pointer?
    if (argument.length > 1 && argument[0] == '*') {
      let argStr = argument.substr(1), token: IAssemblerToken;
      if (argStr.length === 0) throw new AssemblerError(`Syntax Error: invalid syntax '${argument}'`, argument);
      try {
        token = this._parseArgument(argStr, instructionType);
      } catch (e) {
        if (e instanceof AssemblerError) {
          e.insertMessage(`Error whilst parsing pointer argument '${argument}':`);
        }
        throw e;
      }

      // Is this a valid pointer type?
      if (token.type === AssemblerType.Register) {
        token.type = AssemblerType.RegisterPtr;
      } else {
        throw new AssemblerError(`Syntax Error: invalid syntax '${argument}' : unknown pointer type '${AssemblerType[token.type]}'`, argument);
      }
      return token;
    } else if (argument.length > 1 && argument[0] == '#') {
      // Constant value?
      token.type = AssemblerType.Constant;
      const base = argument[1] === '-' ? undefined : getNumericBaseFromPrefix(argument[1]);
      if (base == undefined) {
        token.num = +argument.slice(1); // No base; default of decimal
      } else {
        if (isNaN(base)) throw new AssemblerError(`Syntax Error: invalid numeric base flag '${argument[1]}'`, argument[1]); // Invalid base number
        token.num = base == undefined ? +argument.slice(1) : parseInt(argument.slice(2), base);
      }
    } else if (argument[0] == '\'') {
      if (argument[argument.length - 1] !== '\'') throw new AssemblerError(`Syntax Error: unclosed character literal`, argument);
      let content = argument.substr(1, argument.length - 2);
      if (content.length > 1) throw new AssemblerError(`Syntax Error: charcater literal too large`, content);
      let num = argument[1].charCodeAt(0);
      token.type = AssemblerType.Constant;
      token.value = argument[1];
      token.num = num;
      return token;
    } else {
      const registerMeta = this._cpu.registerMap[argument.toLowerCase()];
      if (registerMeta) {
        // Register
        token.type = AssemblerType.Register;
        token.num = registerMeta.offset;
        token.ntype = this._cpu.regType.type;
      } else {
        // Address..?
        let base = argument[0] === '-' ? undefined : getNumericBaseFromPrefix(argument[0]), addr: number;
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
          token.ntype = this._cpu.addrType.type;
        } else {
          // Symbol?
          if (isValidSymbol(argument)) {
            token.type = AssemblerType.Symbol;
          } else {
            if (expandedSymbol) {
              throw new AssemblerError(`Syntax Error: operand type cannot be determined: ${argument} (expanded from constant ${expandedSymbol})`, expandedSymbol);
            } else {
              throw new AssemblerError(`Syntax Error: operand type cannot be determined: ${argument}`, argument);
            }
          }
        }
      }
    }

    return token;
  }

  /**
   * Return instruction if given string is an instruction
   * Syntax: <mnemonic>[ntype]
  */
  private _getInstructionFromString(string: string): { instruction: string, ntype: NumberType } | null {
    const stringL = string.toLowerCase();
    for (let instruction in this._imap) {
      if (this._imap.hasOwnProperty(instruction)) {
        const mnemonic = this._imap[instruction].mnemonic.toLowerCase();
        if (mnemonic === stringL.substr(0, mnemonic.length)) {
          // Find numeric type
          let remains = stringL.substr(mnemonic.length), ntype: NumberType;
          if (this._cpu.instructTypeSuffixes) {
            for (let abbr in numericTypesAbbr) {
              if (numericTypesAbbr.hasOwnProperty(abbr) && abbr === remains.substr(0, abbr.length).toLowerCase()) {
                ntype = numericTypesAbbr[abbr] as NumberType;
              }
            }
          }
          if (ntype === undefined) {
            ntype = this._cpu.numType.type;
          } else {
            remains = remains.substr(ntype.length);
          }
          if (remains.length > 0) return null;

          return {
            instruction: mnemonic,
            ntype,
          };
        }
      }
    }
    return null;
  }

  /**
   * De-compile code
   * @param useLabels - Transform JUMP commands to BRANCH commands with labels?
   */
  public deAssemble(bytes: ArrayBuffer, useLabels: boolean = false): void {
    this._bytes = bytes;
    this._assembly = '';
    const numbers = bufferToArray(bytes, this._cpu.numType);
    const lines: string[][] = [];
    this._labels.clear();
    let currentLabelN = 1;

    for (let i = 0; i < numbers.length;) {
      try {
        const number = numbers[i], mnemonic = this._cpu.getMnemonic(number);
        if (mnemonic) {
          try {
            let info = this._imap[mnemonic], line = [info.mnemonic], skipMain = false;
            i++;

            // "Main Block" -> parse arguments
            if (!skipMain) {
              for (let j = 0; j < info.args.length; i++, j++) {
                const number = numbers[i];
                if (number === undefined) throw new AssemblerError(`${mnemonic} expects ${info.args.length} arguments - could not fetch argument ${j + 1}`, this._cpu.toHex(info.opcode));
                try {
                  if (info.args[j] === AssemblerType.Register) {
                    let register = this._cpu.registerMap[number];
                    if (register === undefined) throw new AssemblerError(`Cannot find register with offset +0x${number.toString(16)}`, this._cpu.toHex(number));
                    line.push(register);
                  } else if (info.args[j] === AssemblerType.Constant) {
                    line.push('#' + number);
                  } else if (info.args[j] === AssemblerType.RegisterPtr) {
                    let register = this._cpu.registerMap[number];
                    if (register === undefined) throw new AssemblerError(`Cannot find register with offset +0x${number.toString(16)}`, this._cpu.toHex(number));
                    line.push('*' + register);
                  } else {
                    line.push(number.toString());
                  }
                } catch (e) {
                  if (e instanceof AssemblerError) {
                    e.insertMessage(`${mnemonic}: error whilst decoding instruction ${j + 1} of type <${AssemblerType[info.args[j]]}> : 0x${this._cpu.toHex(number)}`);
                  }
                  throw e;
                }
              }
            }

            lines.push(line);
          } catch (e) {
            if (e instanceof AssemblerError) {
              e.insertMessage(`Error whilst decoding instruction ${mnemonic} (0x${this._cpu.toHex(number)}):`);
            }
            throw e;
          }
        } else {
          throw new AssemblerError(`Unknown opcode 0x${number.toString(16)} - cannot resolve to mnemonic`, this._cpu.toHex(number));
        }
      } catch (e) {
        if (e instanceof AssemblerError) {
          e.insertMessage(`Fatal error whilst decoding byte 0x${this._cpu.toHex(numbers[i])} at offset +0x${i.toString(16)}:`);
          e.setUnderlineString(numbers.map(n => this._cpu.toHex(n)).join(' '));
          e.lineNumber = 1;
        }
        throw e;
      }
    }

    // Place labels into array
    this._labels.forEach((addr, label) => {
      for (let i = 0, k = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++, k++) {
          if (k === this._labels.get(label)) {
            lines.splice(i, 0, [label + ':']);
          }
        }
      }
    });

    this._assembly = lines.map(arr => arr.join(' ')).join('\n');
  }
}

export default Assembler;