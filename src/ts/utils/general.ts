import { DataviewGetMethod, DataviewSetMethod, INumberType, ITextMeasurements, NumberType } from "../types/general";

export const capitalise = str => str.split(' ').map(s => s[0].toUpperCase() + s.substr(1).toLowerCase()).join(' ');

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

/** Create Enumeration object from an input object. */
export function createEnum(object: object): object {
  const enumeration = {};
  for (let key in object)
    if (object.hasOwnProperty(key)) {
      enumeration[key] = object[key];
      enumeration[object[key]] = key;
    }
  return enumeration;
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

export const splitString = (string: string, nSize: number): string[] => string.match(new RegExp(`.{1,${nSize}}`, 'g'));

export const numericTypes: NumberType[] = ["int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float32", "float64"];
export const numericTypesAbbr = {
  i8: "int8", u8: "uint8",
  i16: "int16", u16: "uint16",
  i32: "int32", u32: "uint32",
  i64: "int64", u64: "uint64",
  f32: 'float32',
  f64: 'float64',
};
export const numericTypesAbbrEnum = createEnum(numericTypesAbbr);

/** Given number type, return information */
export function getNumTypeInfo(type: NumberType): INumberType {
  let getMethod: DataviewGetMethod, setMethod: DataviewSetMethod, bytes: number, constructor;

  switch (type) {
    case "int8":
      getMethod = "getInt8";
      setMethod = "setInt8";
      bytes = 1;
      constructor = Int8Array;
      break;
    case "uint8":
      getMethod = "getUint8";
      setMethod = "setUint8";
      bytes = 1;
      constructor = Uint8Array;
      break;
    case "int16":
      getMethod = "getInt16";
      setMethod = "setInt16";
      bytes = 2;
      constructor = Int16Array;
      break;
    case "uint16":
      getMethod = "getUint16";
      setMethod = "setUint16";
      bytes = 2;
      constructor = Uint16Array;
      break;
    case "int32":
      getMethod = "getInt32";
      setMethod = "setInt32";
      bytes = 4;
      constructor = Int32Array;
      break;
    case "uint32":
      getMethod = "getUint32";
      setMethod = "setUint32";
      bytes = 4;
      constructor = Uint32Array;
      break;
    case "int64":
      getMethod = "getInt64";
      setMethod = "setInt64";
      bytes = 8;
      constructor = BigInt64Array;
      break;
    case "uint64":
      getMethod = "getUint64";
      setMethod = "setUint64";
      bytes = 8;
      constructor = BigUint64Array;
      break;
    case "float32":
      getMethod = "getFloat32";
      setMethod = "setFloat32";
      bytes = 4;
      constructor = Float32Array;
      break;
    case "float64":
      getMethod = "getFloat64";
      setMethod = "setFloat64";
      bytes = 8;
      constructor = Float64Array;
      break;
    default:
      throw new TypeError(`Unknown numeric type '${type}'`);
  }

  const isInt = type.indexOf("int") !== -1
  return { type, getMethod, setMethod, bytes, isInt, constructor };
}
globalThis.getNumTypeInfo = getNumTypeInfo;

/** Map type string to number-type object */
export const numericTypeToObject = Object.fromEntries(numericTypes.map(t => ([t, getNumTypeInfo(t)])));
globalThis.numericTypeToObject = numericTypeToObject;

/** Map number types to their corresponding numbers */
export const numberTypeMap = createEnum(Object.fromEntries(numericTypes.map((t, i) => ([t, i]))));

export function castNumber(number: number, fromType: INumberType, toType: INumberType) {
  let size = Math.max(fromType.bytes, toType.bytes) / fromType.bytes;
  let arrFrom = new fromType.constructor(size);
  arrFrom[0] = number;
  let arrTo = new toType.constructor(arrFrom.buffer);
  return Number(arrTo[0]);
}
globalThis.castNumber = castNumber;

export const hex = (n: number, len: number = 0) => (+n).toString(16).toUpperCase().padStart(len, '0');

export function numberToString(type: INumberType, n: number, base: number): string {
  const maxLength = (0xff).toString(base).length;

  const buffer = new ArrayBuffer(type.bytes), view = new DataView(buffer);
  view[type.setMethod](0, n);

  let str = '';
  for (let i = 0; i < view.byteLength; i++) {
    let n = view.getUint8(i);
    str += n.toString(base).padStart(maxLength, '0');
  }

  return str;
}

export function numberFromString(type: INumberType, str: string, base: number): number {
  const length = (0xff).toString(base).length;

  const buffer = new ArrayBuffer(type.bytes), view = new DataView(buffer);
  let bytes = splitString(str, length);

  if (bytes.length !== type.bytes) throw new Error(`Decoding '${str}' to ${type} (${type.bytes} bytes) from base ${base}: expected input to be in ${length}-byte chunks`);

  for (let i = 0; i < view.byteLength; i++) {
    let n = parseInt(bytes[i], base);
    view.setUint8(i, n);
  }

  return view[type.getMethod](0);
}

/**
 * Returns [min, max] ranges of numeric data types
 * - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
 */
export function getMinMaxValues(datatype: NumberType | INumberType): [number, number] {
  let type = typeof datatype === 'object' ? datatype.type : datatype;
  switch (type) {
    case 'int8': return [-128, 127];
    case 'uint8': return [0, 255];
    case 'int16': return [-32768, 32767];
    case 'uint16': return [0, 65535];
    case 'int32': return [-2147483648, 2147483647];
    case 'uint32': return [0, 4294967295];
    case 'int64': return [-9223372036854775808, 9223372036854775807];
    case 'uint64': return [0, 18446744073709551615];
    case 'float32': return [1.2e-38, 3.4e+38];
    case 'float64': return [5.0e-324, 1.7976931348623157e+308]; // Roughly 1.8e+308
    default:
      return [NaN, NaN];
  }
}

DataView.prototype.setInt64 = function (byteOffset: number, value: number): void {
  return this.setBigInt64(byteOffset, BigInt(value));
};
DataView.prototype.getInt64 = function (byteOffset: number): number {
  return Number(this.getBigInt64(byteOffset));
};

DataView.prototype.setUint64 = function (byteOffset: number, value: number): void {
  return this.setBigUint64(byteOffset, BigInt(value));
};
DataView.prototype.getUint64 = function (byteOffset: number): number {
  return Number(this.getBigUint64(byteOffset));
};

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

/**
 * Turn array buffer to array of numbers
 */
export function bufferToArray(buffer: ArrayBuffer, type: INumberType): number[] {
  const view = new DataView(buffer), numbers: number[] = [];
  for (let i = 0; i < view.byteLength; i += type.bytes) {
    let num = view[type.getMethod](i);
    numbers.push(num);
  }
  return numbers;
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

export function reverseKeyValues(o: any): any {
  const reversed = {};
  for (let key in o) {
    if (o.hasOwnProperty(key)) {
      reversed[o[key]] = key;
    }
  }
  return reversed;
}

export const createLink = (html?: string): HTMLSpanElement => {
  const link = document.createElement("span");
  if (typeof html === 'string') link.innerHTML = html;
  link.classList.add("link");
  return link;
};

export function seperateNumber(n: number, seperator = ','): string {
  return n.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, seperator);
}

export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export async function readBinaryFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function downloadTextFile(text: string, fname: string) {
  let data = new Blob([text], { type: 'text/plain' });
  let url = window.URL.createObjectURL(data);
  downloadLink(url, fname);
};

export function downloadBlob(data: any, filename: string, mimeType: string) {
  let blob = new Blob([data], { type: mimeType });
  let url = window.URL.createObjectURL(blob);
  downloadLink(url, filename);
};

export function downloadLink(href: string, fname: string) {
  const a = document.createElement('a');
  a.href = href;
  a.setAttribute('download', fname);
  a.click();
  a.remove();
};

/**
 * Generate input for a number along with a combobox containing common bases
 * Provide callback for input:change event
 */
export function insertNumericalBaseInput(parent: HTMLElement, callback: (n: number) => void): HTMLInputElement {
  let base = 16;

  const fn = () => {
    let num = parseInt(input.value, base);
    callback(num);
  };

  const wrapper = document.createElement('span');
  parent.appendChild(wrapper);
  wrapper.classList.add('multi-base-input');

  let selectBase = document.createElement('select');
  selectBase.insertAdjacentHTML('beforeend', `<option value='16' title='Hexadecimal'>0x</option>`);
  selectBase.insertAdjacentHTML('beforeend', `<option value='10' title='Decimal'>0d</option>`);
  selectBase.insertAdjacentHTML('beforeend', `<option value='2' title='Binary'>0b</option>`);
  selectBase.insertAdjacentHTML('beforeend', `<option value='8' title='Octal'>0o</option>`);
  selectBase.addEventListener('change', () => {
    let oldValue = parseInt(input.value, base);
    base = parseInt(selectBase.value);
    let newValue = oldValue.toString(base);
    input.value = newValue;
    fn();
  });
  wrapper.appendChild(selectBase);

  let input = document.createElement("input");
  input.type = "text";
  input.value = "0";
  input.addEventListener('change', () => fn());
  wrapper.appendChild(input);

  return input;
}

/** Sort object by alphabetical keys */
export function sortObjectKeysAlphabetical<T>(o: T): T {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b))) as T;
}

/** Sort object by alphabetiocal key value */
export function sortObjectByKeyAlphabetical<T>(o: T, key: string): T {
  return Object.fromEntries(Object.entries(o).sort(([_a, a], [_b, b]) => a[key].localeCompare(b[key]))) as T;
}

/** Sort object by numeric key value */
export function sortObjectByKey<T>(o: T, key: string): T {
  return Object.fromEntries(Object.entries(o).sort(([_a, a], [_b, b]) => a[key] - b[key])) as T;
}

/** Group values in an object by a key */
export function objectGroupBy<T>(o: T, groupByKey: string): { [group: string]: T } {
  const grouped = {};
  for (let key in o) {
    if (!(o[key][groupByKey] in grouped)) grouped[o[key][groupByKey]] = {};
    grouped[o[key][groupByKey]][key] = o[key];
  }
  return grouped;
}

export function booleanToHTML(bool: boolean): string {
  return bool ? `<span style='color:forestgreen;font-weight:bold;'>Yes</span>` : `<span style='color:tomato;'>No</span>`;
}

/** Clamp a number within a range */
export const clamp = (min: number, max: number, n: number) => {
  if (n < min) return min;
  if (n > max) return max;
  return n;
};