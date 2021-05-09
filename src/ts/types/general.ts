export interface ITextMeasurements {
  width: number;
  height: number;
}

export type NumberType = "int8" | "uint8" | "int16" | "uint16" | "int32" | "uint32" | "float32" | "float64";
export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
export type DataviewGetMethod = "getInt8" | "getUint8" | "getInt16" | "getUint16" | "getInt32" | "getUint32" | "getFloat32" | "getFloat64";
export type DataviewSetMethod = "setInt8" | "setUint8" | "setInt16" | "setUint16" | "setInt32" | "setUint32" | "setFloat32" | "setFloat64";

export interface INumberType {
  type: NumberType;
  array: TypedArray;
  bytes: number;
  getMethod: DataviewGetMethod;
  setMethod: DataviewSetMethod;
};

export type TypedIntArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array;