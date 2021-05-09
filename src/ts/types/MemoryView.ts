import { ITextMeasurements } from "./general";

export interface IMemoryViewCache {
  ySpacing: number;
  offsetLabelsLength: number; // Padding of '0's required on hexadecimal addresses
  offsetLabelsDimensions: ITextMeasurements;
  rowTitleWidth: number;
  xSpacing: number;
  xPad: number;
}