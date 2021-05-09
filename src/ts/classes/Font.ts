import { FontStyle, FontVariant, FontWeight } from "../types/Font";

export class Font {
  public style: FontStyle;
  public variant: FontVariant;
  public weight: FontWeight;
  public size: number;
  public sizeUnits: string;
  public family: string;

  constructor() {
    this.toDefault();
  }

  public toString(): string {
    return `${this.style} ${this.variant} ${this.weight} ${this.size}${this.sizeUnits} ${this.family}`;
  }

  public apply(ctx: CanvasRenderingContext2D): void {
    ctx.font = this.toString();
  }

  public toDefault() {
    this.style = "normal";
    this.variant = "normal";
    this.weight = "normal";
    this.size = 10;
    this.sizeUnits = 'px';
    this.family = "sans-serif";
  }

  public clone(): Font {
    const font = new Font();
    font.style = this.style;
    font.variant = this.variant;
    font.weight = this.weight;
    font.size = this.size;
    font.sizeUnits = this.sizeUnits;
    font.family = this.family;
    return font;
  }

  public static fromString(string: string): Font {
    const div = document.createElement("div"), font = new Font();
    div.style.font = string;

    font.style = div.style.fontStyle as FontStyle;
    font.variant = div.style.fontVariant as FontVariant;
    font.weight = div.style.fontWeight as FontWeight;
    let [size, units] = div.style.fontSize.split(/(?<=[0-9\.])(?=[A-Za-z])/);
    font.size = +size;
    font.sizeUnits = units || 'px';
    font.family = div.style.fontFamily;
    return font;
  }
}

export default Font;

globalThis.Font = Font;