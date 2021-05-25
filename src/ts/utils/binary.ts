import { Bit } from '../types/general';

/** Make two binary strings of equal length. */
function makeEqualLength(a: string, b: string): [string, string] {
    if (a.length > b.length) {
        b = b.padStart(a.length, '0');
    } else if (b.length > a.length) {
        a = a.padStart(b.length, '0');
    } return [a, b];
}

const xor = (a: Bit, b: Bit): Bit => a === b ? 0 : 1;
const and = (a: Bit, b: Bit): Bit => a === 1 && b === 1 ? 1 : 0;
const or = (a: Bit, b: Bit): Bit => a === 1 || b === 1 ? 1 : 0;

/**
 * Add two bits together
 * @return [sum, carry]
 */
function halfAdder(a: Bit, b: Bit): [Bit, Bit] {
    const sum = xor(a, b);
    const carry = and(a, b);
    return [sum, carry];
}

/**
 * Add three bits together
 * @return [sum, carry]
 */
function fullAdder(a: Bit, b: Bit, c: Bit): [Bit, Bit] {
    let halfAdd = halfAdder(a, b);
    const sum = xor(c, halfAdd[0]);
    c = and(c, halfAdd[0]);
    c = or(c, halfAdd[1]);
    return [sum, c];
}

export function addBinary(a: string, b: string): string {
    let sum = '', carry: Bit = 0;
    [a, b] = makeEqualLength(a, b);
    console.log(a, "+", b)

    for (let i = a.length - 1; i >= 0; i--) {
        if (i == a.length - 1) {
            // half add the first pair
            const halfAdd1 = halfAdder(+a[i] as Bit, +b[i] as Bit);
            sum = halfAdd1[0] + sum;
            carry = halfAdd1[1];
        } else {
            //full add the rest
            const fullAdd = fullAdder(+a[i] as Bit, +b[i] as Bit, carry);
            sum = fullAdd[0] + sum;
            carry = fullAdd[1];
        }
    }

    console.log(carry);
    return sum;
}
globalThis.addBinary = addBinary;