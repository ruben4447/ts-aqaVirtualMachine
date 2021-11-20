import { AssemblerType, IAssemblerToken } from "../types/Assembler";

const _symbolCompatible = [AssemblerType.Constant, AssemblerType.Address];

/** Matches type signature? */
export function matchesTypeSignature(tokens: IAssemblerToken[], types: AssemblerType[]): boolean {
  if (tokens.length !== types.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== types[i]) return false;
  }
  return true;
}

/** Label regexp */
export const label_regex = /^[A-Za-z][A-Za-z0-9_\$]*$/;
export function isValidSymbol(str: string) {
  if (str === '$') return true;
  return label_regex.test(str);
}

export interface IParseNumberOptions {
  exponent?: boolean; // Allow exponent ...e
  decimal?: boolean; // Allow decimal
  seperator?: string; // Numeric seperator
  signed?: boolean; // Scan for +/-
}

const radices = { x: 16, d: 10, b: 2, o: 8 };
const radicesRegex = { 16: /[0-9A-Fa-f]/, 10: /[0-9]/, 2: /[01]/, 8: /[0-7]/ };
export function parseNumber(string: string, opts: IParseNumberOptions = {}) {
  opts.exponent ??= true;
  opts.decimal ??= true;
  opts.signed ??= true;

  let pos = 0, sign = 1, strBeforeDot = '', strAfterDot = '', radix = 10, exp = null;
  let metSign = !opts.signed, metDigitBeforeDecimal = false, metDot = false, metDigitAfterDecimal = false, metE = false, metSeperator = false, metRadix = false;

  for (pos = 0; pos < string.length; pos++) {
    if (!metSign && (string[pos] === '-' || string[pos] === '+')) { // Sign
      metSign = true;
      sign = string[pos] === '-' ? -1 : 1;
      metSeperator = false;
    } else if ((pos === 0 || (metSign && pos === 1)) && string[pos] === '0' && string[pos + 1] in radices) { // Radix
      pos++;
      radix = radices[string[pos]];
    } else if (radicesRegex[radix].test(string[pos])) { // Digit
      metSeperator = false;
      if (!metSign) metSign = true; // Default to '+'
      if (metDot) {
        strAfterDot += string[pos];
        metDigitAfterDecimal = true;
      } else {
        strBeforeDot += string[pos];
        metDigitBeforeDecimal = true;
      }
    } else if (opts.decimal && string[pos] === '.') { // seperator
      if (metSeperator) throw new Error("Invalid syntax: expected digit in number literal");
      if (!metDot) {
        metDot = true;
      } else {
        break; // INVALID
      }
    } else if (string[pos].toLowerCase() === 'e') {
      if (metSeperator) throw new Error("Invalid syntax: expected digit in number literal");
      metSeperator = false;
      if (opts.exponent) {
        const newOpts = { ...opts };
        newOpts.exponent = false;
        const obj = parseNumber(string.substr(pos + 1), newOpts);
        if (obj.str === '') break;
        pos += 1 + obj.pos;
        exp = obj;
        break;
      } else {
        break; // INVALID
      }
    } else if (opts.seperator && string[pos] === opts.seperator) {
      if (metSeperator) {
        throw new Error(`Invalid number literal: unexpected seperator`);
      } else {
        if (metDot && !metDigitAfterDecimal) break;
        if (!metDigitBeforeDecimal) break;
        metSeperator = true;
      }
    } else {
      break; // INVALID
    }
  }

  if (strBeforeDot !== '') strBeforeDot = parseInt(strBeforeDot, radix).toString();
  if (strAfterDot !== '') strAfterDot = parseInt(strAfterDot, radix).toString();
  let str = strBeforeDot + (metDot ? '.' + strAfterDot : '');
  if (str === '.' || str.startsWith('.e')) {
    pos = 0;
    str = '';
  }

  let num = sign * +str, base = num;
  if (exp) {
    num *= Math.pow(10, exp.num);
    str += 'e' + exp.str;
    exp = exp.num;
  }
  return { pos, str: string.substring(0, pos), sign, base, exp, radix, num };
}

/** Decode an escape sequence and return the character and new position */
export function decodeEscapeSequence(string: string, pos: number): { char: string, pos: number } {
  let char: string;
  switch (string[pos]) {
    case 'b': char = String.fromCharCode(0x8); pos++; break; // BACKSPACE
    case 'n': char = String.fromCharCode(0xA); pos++; break; // LINE FEED
    case 'r': char = String.fromCharCode(0xD); pos++; break; // CARRIAGE RETURN
    case 't': char = String.fromCharCode(0x9); pos++; break; // HORIZONTAL TAB
    case 'v': char = String.fromCharCode(0xB); pos++; break; // VERTICAL TAB
    case '0': char = String.fromCharCode(0x0); pos++; break; // NULL
    case 's': char = String.fromCharCode(0x20); pos++; break; // WHITESPACE
    case 'x': { // HEXADECIMAL ESCAPE SEQUENCE
      pos++;
      let nlit = '';
      while (string[pos] && /[0-9A-Fa-f]/.test(string[pos])) {
        nlit += string[pos];
        pos++;
      }
      if (nlit.length === 0) throw new Error(`Invalid hexadecimal escape sequence. Expected hexadecimal character, got '${string[pos]}'`);
      char = String.fromCharCode(parseInt(nlit, 16));
      break;
    }
    case 'o': { // OCTAL ESCAPE SEQUENCE
      pos++;
      let nlit = '';
      while (string[pos] && /[0-7]/.test(string[pos])) {
        nlit += string[pos];
        pos++;
      }
      if (nlit.length === 0) throw new Error(`Invalid octal escape sequence. Expected octal character, got '${string[pos]}'`);
      char = String.fromCharCode(parseInt(nlit, 8));
      break;
    }
    case 'd': { // DECIMAL ESCAPE SEQUENCE
      pos++;
      let nlit = '';
      while (string[pos] && /[0-9]/.test(string[pos])) {
        nlit += string[pos];
        pos++;
      }
      if (nlit.length === 0) throw new Error(`Invalid decimal escape sequence. Expected decimal character, got '${string[pos]}'`);
      char = String.fromCharCode(parseInt(nlit, 10));
      break;
    }
    default:
      char = string[pos++];
  }
  return { char, pos };
}

/** Parse caracter literal (assume literal is enclosed in '<literal>') */
export function parseCharLit(literal: string): string {
  if (literal[0] === '\\') {
    let obj = decodeEscapeSequence(literal, 1);
    if (obj.pos !== literal.length) throw new Error(`Character literal too large`);
    return obj.char;
  } else {
    if (literal.length !== 1) throw new Error(`Character literal too large`);
    return literal[0];
  }
}

/** Parse and return extracted string from string[startIndex] to " */
export function parseString(string: string, startIndex: number): { string: string, endIndex: number } {
  let seq = '', j = startIndex;
  while (true) {
    if (string[j] === '"') break;
    if (string[j] === '\\' && string[j + 1]) { // ESCAPE SEQUENCE
      ++j;
      const obj = decodeEscapeSequence(string, j);
      if (obj.char) {
        j = obj.pos;
        seq += obj.char;
        continue;
      }
    }
    if (string[j] === undefined) throw new Error(`Unexpected end of input in string literal at position ${j}`);
    seq += string[j];
    j++;
  }
  return { string: seq, endIndex: j };
}

/** Return array of numbers from bytestring */
export function parseByteList(string: string) {
  const bytes = [];
  const items = string.split(',').map(x => x.trim()).filter(x => x.length !== 0);

  for (let item of items) {
    let error = false, suberror: string;

    if (item[0] === '\'') {
      if (item[item.length - 1] === '\'') {
        try {
          const raw = item.substring(1, item.length - 1), extract = parseCharLit(raw);
          bytes.push(extract.charCodeAt(0));
        } catch (e) {
          suberror = e.message;
          error = true;
        }
      } else {
        suberror = 'Unclosed character literal';
        error = true;
      }
    } else if (item[0] === '"') {
      let sobj;
      try {
        sobj = parseString(item, 1);
        for (let char of sobj.string) {
          bytes.push(char.charCodeAt(0));
        }
      } catch (e) {
        error = true;
        suberror = item + ": " + e.message;
      }
    } else {
      let nobj = parseNumber(item);
      if (nobj.pos === item.length) {
        bytes.push(nobj.base);
      } else {
        error = true;
      }
    }

    if (error) throw new Error(`Byte ${item}: invalid byte${suberror ? ': ' + suberror : ''}`);
  }

  return bytes;
}