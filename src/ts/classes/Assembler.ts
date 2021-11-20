import CPU from "./CPU/CPU";
import { AssemblerType, AssemblyLineType, IInstructionSet, IAssemblerToken, IAssemblyInstructionLine } from "../types/Assembler";
import { decodeEscapeSequence, isValidSymbol, label_regex, matchesTypeSignature, parseByteList, parseCharLit } from "../utils/Assembler";
import { bufferToArray, getNumericBaseFromPrefix, numericTypesAbbr, underlineStringPortion, numericTypeToObject, numberTypeMap } from "../utils/general";
import { INumberType, NumberType } from "../types/general";
import { Expression } from "./Expression";

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
  private _bytes: ArrayBuffer;
  private _symbols: Map<string, string> = new Map();
  public startAddress = 0;

  constructor(cpu: CPU, instructionMap: IInstructionSet) {
    this._imap = instructionMap;
    this._cpu = cpu;
  }

  public setAssemblyCode(code: string) {
    this._assembly = code;
    this._bytes = undefined;
    this._symbols.clear();
  }

  public getAssemblyCode(): string { return this._assembly; }
  public getBytes(): ArrayBuffer | undefined { return this._bytes; }
  public getSymbols(): [string, string][] { return Array.from(this._symbols.entries()); }
  public getSymbol(symbol: string): string | undefined { return this._symbols.get(symbol); }

  /**
   * Parse assembly code string
   * @throws AssemblerError
   * Results can be obtained via this.getAST() or this.getBytes()
   */
  public parse(assembly: string, origin: string = "<anonymous>"): void {
    let buff: ArrayBuffer;
    try {
      buff = this._parse(assembly);
    } catch (e) {
      if (e instanceof AssemblerError) {
        e.fileName = origin;
        e.insertMessage(`Fatal error whilst parsing ${origin}:`);
      }
      throw e;
    }
    this._bytes = buff;
  }

  /**
   * FIRST PASS
   * - Load all static things to memory
   * - Remember location to insert labels
   * SECOND PASS
   * - Evaluate labels
   * - Insert labels
   */
  private _parse(assembly: string) {
    this._symbols.clear();
    this._symbols.set('WORD', this._cpu.numType.bytes.toString());
    this._symbols.set('REGS', Object.keys(this._cpu.registerMap).length.toString());
    const buff = new ArrayBuffer(Math.min(1.049e+6, this._cpu.memorySizeBytes())); // 1 MiB
    const memory = new DataView(buff);
    const symbolIndexes = new Map<number, { symbol: string, type: string, def: string }>(); // Map byteOffsets to insert each symbol
    const symbolExprs = new Map<string, Expression>();
    let byteOffset = 0;

    const lines = assembly.split(/\r|\n|\r\n/g).map(line => line.replace(/;.*$/g, '').trim()).filter(line => line.length > 0);
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i], lineOffset = byteOffset;
      try {
        const parts = line.replace(/,/g, ' ').split(/\s+/g).filter(x => x.length > 0);

        if (parts[0][parts[0].length - 1] === ':') {
          // LABEL
          let label = parts[0].substr(0, parts[0].length - 1), local = false;
          if (label[0] === '.') {
            label = label.substr(1);
            local = true;
          }
          if (parts.length === 1) {
            if (isValidSymbol(label)) {
              this._symbols.set((local ? '.' : '') + label, byteOffset.toString());
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
        } else if (parts[0][0] === '.') {
          // DIRECTIVES
          let cmd = parts[0].substr(1);
          if (cmd === 'stop') {
            break;
          } else if (cmd === 'skip') {
            i++;
            continue;
          } else if (cmd === 'data' || cmd === 'bytes') { // Place following words into memory
            let raw = line.substr(parts[0].length).trimStart(), bytes: number[];
            try {
              bytes = parseByteList(raw);
            } catch (e) {
              const error = new AssemblerError(`Syntax Error: invalid data list`, raw);
              error.appendMessage(e.message);
              error.setUnderlineString(line);
              throw error;
            }
            const ntype = cmd === 'data' ? this._cpu.numType : numericTypeToObject["uint8"];
            for (let i = 0; i < bytes.length; i++) {
              memory[ntype.setMethod](byteOffset, bytes[i]);
              byteOffset += ntype.bytes;
            }
          } else if (cmd === 'equ') { // Define constant
            // Valid name?
            if (isValidSymbol(parts[1])) {
              let string = line.substr(".equ".length);
              string = string.substr(string.indexOf(parts[1]) + parts[1].length).trim();
              this._symbols.set(parts[1], string);
            } else {
              const error = new AssemblerError(`Syntax Error: expected symbol`, parts[1]);
              error.setUnderlineString(line);
              throw error;
            }
          } else {
            const error = new AssemblerError(`Syntax Error: unknown dot directive`, cmd);
            error.setUnderlineString(line);
            throw error;
          }
        } else if (parts[1]?.toLowerCase() === 'equ') {
          // EQU statement
          const name = parts[0];
          if (isValidSymbol(name)) {
            let string = line.substr(name.length + line.substr(name.length).indexOf('equ') + 3).trim();
            const expr = new Expression(string);
            expr.setSymbol('$', lineOffset);
            symbolExprs.set(name, expr);
          } else {
            const error = new AssemblerError(`Syntax Error: invalid name; must match ${label_regex}`, name);
            error.setUnderlineString(line);
            throw error;
          }
        } else {
          // INSTRUCTION?
          const iobj = this._getInstructionFromString(parts[0].toUpperCase()); // Parse as instruction
          if (iobj !== null) { // Instruction!
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
            let typeObj: INumberType;

            // INSTRUCTION BYTES
            typeObj = this._cpu.numType;
            memory[typeObj.setMethod](byteOffset, instructionLine.opcode);
            byteOffset += typeObj.bytes;

            // TYPE SUFFIX
            if (this._cpu.instructTypeSuffixes && this._imap[instructionLine.instruction].typeSuffix) {
              memory.setUint8(byteOffset++, numberTypeMap[instructionLine.ntype]);
            }

            // ARGUMENTS
            instructionLine.args.forEach(arg => {
              typeObj = numericTypeToObject[arg.ntype];
              if (arg.type === AssemblerType.Symbol) {
                if (arg.value[0] === '.') { // LOCAL SYMBOL - replace now
                  if (this._symbols.has(arg.value)) {
                    const value = +this._symbols.get(arg.value);
                    memory[typeObj.setMethod](byteOffset, isNaN(value) ? 0 : value);
                  } else {
                    let err = new AssemblerError(`SYMBOL: reference to unbound local symbol ${arg.value} at +0x${byteOffset.toString(16)}`, arg.value);
                    err.setUnderlineString(line);
                    throw err;
                  }
                } else {
                  symbolIndexes.set(byteOffset, { symbol: arg.value, type: arg.ntype, def: line }); // Record that we need to insert a label value here
                }
              } else {
                memory[typeObj.setMethod](byteOffset, arg.num); // Insert numerical value into memory
              }
              byteOffset += typeObj.bytes;
            });
          } else {
            const error = new AssemblerError(`Syntax Error: invalid syntax`, parts[0]);
            error.setUnderlineString(line);
            throw error;
          }
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

    // EVALUATE SYMBOLS
    symbolExprs.forEach((expr, symbol) => {
      const raw = expr.getRaw();
      this._symbols.forEach((value, key) => expr.setSymbol(key, +value));
      try {
        expr.parse();
      } catch (e) {
        const error = new AssemblerError(`Syntax Error: invalid EQU statement:`, raw);
        error.appendMessage(e.message);
        error.setUnderlineString(raw);
        throw error;
      }
      const result = expr.evaluate();
      if (result.error) {
        const error = new AssemblerError(`Syntax Error: invalid EQU statement:`, raw);
        error.appendMessage(result.msg);
        error.setUnderlineString(raw);
        throw error;
      }
      this._symbols.set(symbol, result.value.toString());
    });

    // INSERT SYMBOLS INTO MEMORY
    symbolIndexes.forEach(({ symbol, type, def }, offset) => {
      if (!this._symbols.has(symbol)) {
        let err = new AssemblerError(`SYMBOL: reference to unbound symbol ${symbol} at +0x${offset.toString(16)}`, symbol);
        err.setUnderlineString(def);
        throw err;
      }
      let value = +this._symbols.get(symbol);
      if (isNaN(value)) value = 0;
      memory[numericTypeToObject[type].setMethod](offset, value);
    });

    return buff.slice(0, byteOffset);
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

    let virtualArgs = [...line.args];
    for (let i = 0; i < virtualArgs.length; i++) {
      if (virtualArgs[i].type === AssemblerType.Symbol) {
        const value = this._symbols.get(virtualArgs[i].value);
        if (value) {
          const registerMeta = this._cpu.registerMap[value.toLowerCase()];
          if (registerMeta) {
            line.args[i].type = AssemblerType.Register;
            line.args[i].num = registerMeta.offset;
            line.args[i].ntype = registerMeta.type ?? this._cpu.regType.type;
            virtualArgs[i] = line.args[i];
            continue;
          }
        }

        virtualArgs[i] = { type: AssemblerType.Constant } as IAssemblerToken;
      }
    }

    // Check if a suitable instruction exists
    for (let operation in this._imap) {
      const commandInfo = this._imap[operation];
      if (commandInfo.mnemonic === instruction && matchesTypeSignature(virtualArgs, commandInfo.args)) {
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
      const arg_types = virtualArgs.map(x => `<${AssemblerType[x.type]}>`).join(' ');
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
      let content = argument.substr(1, argument.length - 2), char;
      try {
        char = parseCharLit(content);
      } catch (e) {
        throw new AssemblerError(`Syntax Error: Invalid character literal: ${e.message}`, content);
      }
      token.type = AssemblerType.Constant;
      token.value = char;
      token.num = char.charCodeAt(0);
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
          let local = false, label = argument;
          if (label[0] === '.') {
            label = label.substr(1);
            local = true;
          }
          if (isValidSymbol(label)) {
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
    this._symbols.clear();
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

    // Place symbols into array
    this._symbols.forEach((addr, symbol) => {
      for (let i = 0, k = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++, k++) {
          if (k === +this._symbols.get(symbol)) {
            lines.splice(i, 0, [symbol + ':']);
          }
        }
      }
    });

    this._assembly = lines.map(arr => arr.join(' ')).join('\n');
  }
}

export default Assembler;