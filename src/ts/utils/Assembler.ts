import { AssemblerType, IAssemblerToken } from "../types/Assembler";

/** Matches type signature? */
export function matchesTypeSignature(tokens: IAssemblerToken[], types: AssemblerType[]): boolean {
  if (tokens.length !== types.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== types[i]) return false;
  }
  return true;
}

/** Label regexp */
export const label_regex = /^[A-Za-z][A-Za-z0-9_]*$/;
export function isValidLabel(str: string) {
  return label_regex.test(str);
}