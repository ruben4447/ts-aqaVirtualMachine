export interface ITextMeasurements {
  width: number;
  height: number;
}

export type NumberType = "int8" | "uint8" | "int16" | "uint16" | "int32" | "uint32" | "int64" | "uint64" | "float32" | "float64";
export type DataviewGetMethod = "getInt8" | "getUint8" | "getInt16" | "getUint16" | "getInt32" | "getUint32" | "getInt64" | "getUint64" | "getFloat32" | "getFloat64";
export type DataviewSetMethod = "setInt8" | "setUint8" | "setInt16" | "setUint16" | "setInt32" | "setUint32" | "setInt64" | "setUint64" | "setFloat32" | "setFloat64";

export interface INumberType {
  type: NumberType;
  bytes: number;
  getMethod: DataviewGetMethod;
  setMethod: DataviewSetMethod;
  isInt: boolean;
  constructor: any; // Constructor for type array
};

export type Bit = 0 | 1;