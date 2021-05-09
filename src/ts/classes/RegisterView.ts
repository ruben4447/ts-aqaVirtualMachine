import { numberToString } from "../utils/general";
import CPU from "./CPU";
import CustomScreen from "./Screen";

export class RegisterView {
  public readonly screen: CustomScreen;
  public readonly cpu: CPU;
  private _base: number = 16;

  public constructor(wrapper: HTMLDivElement, cpu: CPU) {
    this.screen = new CustomScreen(wrapper);
    this.screen.updateFont(font => {
      font.family = "consolas";
      font.size = 12;
    });
    this.cpu = cpu;

    this._render();
  }

  public get base(): number { return this._base; }
  public set base(value: number) { this._base = value; this._render(); }

  public updateScreen(callback: (S: CustomScreen) => void) {
    callback(this.screen);
    this._render();
  }

  private _render() {
    const S = this.screen;
    S.clear();

    const ySpacing = this.screen.getHeight() / this.cpu.registerMap.length;
    let longestRegisterName = "";
    for (const register of this.cpu.registerMap)
      if (register.length > longestRegisterName.length) longestRegisterName = register;
    const registerNameLabelDimensions = S.measureText(longestRegisterName);
    const labelPad = 10;
    const startY = ySpacing / 2 - registerNameLabelDimensions.height / 2;
    const maxValue = (0xff).toString(this._base).repeat(this.cpu.numType.bytes), maxValueDimensions = S.measureText(maxValue);

    // Register Names
    S.saveState();
    S.updateFont(f => {
      f.weight = "bolder";
    });
    S.setForeground("lime");
    S.x = labelPad;
    S.y = startY;
    for (const register of this.cpu.registerMap) {
      S.writeString(register, false);
      S.y += ySpacing;
    }
    S.restoreState();

    // Register values
    const usedSpace = registerNameLabelDimensions.width + 2 * labelPad;
    S.x = usedSpace;
    S.y = startY;
    for (let i = 0; i < this.cpu.registerMap.length; i++) {
      const value = this.cpu.readRegister(i);
      let text = numberToString(this.cpu.numType, value, this._base);
      S.writeString(text, false);
      S.y += ySpacing;
    }
  }

  public update(registerIndex?: number) {
    this._render();
  }
}

export default RegisterView;