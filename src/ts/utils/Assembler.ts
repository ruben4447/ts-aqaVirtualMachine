import { IAssemblerToken } from "../types/Assembler";

/** Matches type signature? */
export function matchesTypeSignature(tokens: IAssemblerToken[], types: number[]): boolean {
  if (tokens.length !== types.length) return false;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== types[i]) return false;
  }
  return true;
}