import { DataviewGetMethod, DataviewSetMethod, INumberType, ITextMeasurements, NumberType, TypedArray } from "../types/general";

/** Get numeric base from prefix. No prefix: undefined. Unknown prefix: NaN */
export function getNumericBaseFromPrefix(prefix: string): number | undefined {
  // If numeric, then there is none
  if (!isNaN(parseInt(prefix))) return undefined;

  switch (prefix) {
    case 'b': return 2;
    case 'o': return 8;
    case 'd': return 10;
    case 'x': return 16;
    default: return NaN;
  }
}

export function underlineStringPortion(string: string, startPos: number, length: number = 1, prefix: string = "") {
  return prefix + string + '\n' + (' '.repeat(startPos + prefix.length)) + ('~'.repeat(length));;
}

export const scrollToBottom = (el: HTMLElement) => el.scrollTop = el.scrollHeight;

export const getTextMetrics = (ctx: CanvasRenderingContext2D, text: string): ITextMeasurements => {
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    height: metrics.fontBoundingBoxDescent + metrics.fontBoundingBoxAscent,
  };
};

export const splitString = (string: string, nSize: number) => string.match(new RegExp(`.{1,${nSize}}`, 'g'));

/** Given number type, return information */
export function getNumTypeInfo(type: NumberType): INumberType {
  let array: TypedArray, getMethod: DataviewGetMethod, setMethod: DataviewSetMethod, bytes: number;

  switch (type) {
    case "int8":
      array = Int8Array;
      getMethod = "getInt8";
      setMethod = "setInt8";
      bytes = 1;
      break;
    case "uint8":
      array = Uint8Array;
      getMethod = "getUint8";
      setMethod = "setUint8";
      bytes = 1;
      break;
    case "int16":
      array = Int16Array;
      getMethod = "getInt16";
      setMethod = "setInt16";
      bytes = 2;
      break;
    case "uint16":
      array = Uint16Array;
      getMethod = "getUint16";
      setMethod = "setUint16";
      bytes = 2;
      break;
    case "int32":
      array = Int32Array;
      getMethod = "getInt32";
      setMethod = "setInt32";
      bytes = 4;
      break;
    case "uint32":
      array = Uint32Array;
      getMethod = "getUint32";
      setMethod = "setUint32";
      bytes = 4;
      break;
    case "float32":
      array = Float32Array;
      getMethod = "getFloat32";
      setMethod = "setFloat32";
      bytes = 4;
      break;
    case "float64":
      array = Float64Array;
      getMethod = "getFloat64";
      setMethod = "setFloat64";
      bytes = 8;
      break;
    default:
      throw new TypeError(`Unknown numeric type '${type}'`);
  }

  return { type, array, getMethod, setMethod, bytes };
}

export const hex = (n: number, len: number = 0) => (+n).toString(16).toUpperCase().padStart(len, '0');

export function numberToString(type: INumberType, n: number, base: number): string {
  const maxLength = (0xff).toString(base).length;

  let a = new Uint8Array(type.bytes);
  let view = new DataView(a.buffer);
  view[type.setMethod](0, n);

  let str = '';
  for (let i = 0; i < a.length; i++) {
    let n = view.getUint8(i);
    str += n.toString(base).padStart(maxLength, '0');
  }

  return str;
}

export function numberFromString(type: INumberType, str: string, base: number): number {
  const length = (0xff).toString(base).length;

  let a = new Uint8Array(type.bytes);
  let bytes = splitString(str, length);

  if (bytes.length !== type.bytes) throw new Error(`Decoding '${str}' to ${type} (${type.bytes} bytes) from base ${base}: expected input to be in ${length}-byte chunks`);

  for (let i = 0; i < a.length; i++) {
    let n = parseInt(bytes[i], base);
    a[i] = n;
  }

  let view = new DataView(a.buffer);
  return view[type.getMethod](0);
}

export const rowColToIndex = (row: number, col: number, cols: number) => (row * cols) + col;

/** Return portion of array */
export function getArrayPortion<T>(array: T, start: number, length: number): T {
  const portion = new (array as any).constructor(length); // Copy input type and pass in size
  for (let i = 0; i < length; i++) {
    portion[i] = array[start + i];
  }

  return portion as T;
}

/**
 * Function to turn a numerical array into an ArrayBuffer
 * ! NB Not using TypedArrays as these caused endianness issues
 */
export function arrayToBuffer(array: number[], type: INumberType): ArrayBuffer {
  const bytes = array.length * type.bytes;
  const buffer = new ArrayBuffer(bytes), dview = new DataView(buffer);
  for (let i = 0; i < array.length; i++) {
    const offset = i * type.bytes;
    dview[type.setMethod](offset, array[i]);
  }
  return buffer;
}

/** Try to remove child from parent, but doesn't throw error on failure. */
export function removeChild(parent: HTMLElement, child: HTMLElement): boolean {
  try {
    parent.removeChild(child);
    return true;
  } catch {
    return false;
  }
}