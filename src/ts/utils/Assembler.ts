import { AssemblerType, IAssemblerToken } from "../types/Assembler";

const _symbolCompatible = [AssemblerType.Constant, AssemblerType.Address];

/** Matches type signature? */
export function matchesTypeSignature(tokens: IAssemblerToken[], types: AssemblerType[]): boolean {
  if (tokens.length !== types.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === AssemblerType.Symbol && _symbolCompatible.includes(types[i])) continue; // Symbols may be converted to pretty much anything
    if (tokens[i].type !== types[i]) return false;
  }
  return true;
}

/** Label regexp */
export const label_regex = /^[A-Za-z][A-Za-z0-9_\$]*$/;
export function isValidSymbol(str: string) {
  return label_regex.test(str);
}