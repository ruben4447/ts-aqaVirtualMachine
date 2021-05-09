import type Font from "../classes/Font";

export type ScreenColour = null | string | CanvasGradient | CanvasPattern;

export interface IScreenState {
  foreground: ScreenColour;
  background: ScreenColour;
  x: number;
  y: number;
  font: Font;
};