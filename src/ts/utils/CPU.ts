/** Comparison results. Note, no negative numbers to support unsigned data types. */
export enum CMP {
  EQUAL_TO = 0x0,
  LESS_THAN = 0x1,
  GREATER_THAN = 0x2,
}

export function compare(a: number, b: number): CMP {
  if (a == b) return CMP.EQUAL_TO;
  else if (a < b) return CMP.LESS_THAN;
  else if (a > b) return CMP.GREATER_THAN;
  else throw new Error(`Compare: How the fuck did we get here? We somehow denied all logic...`);
}