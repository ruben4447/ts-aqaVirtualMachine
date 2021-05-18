import CPU from "./CPU";
import CustomScreen from "./Screen";
import { hex, numberToString } from "../utils/general";
import { IMemoryViewCache } from "../types/MemoryView";
import { withinState } from "../utils/Screen";
import instructionSet from "../instructionSet";

const pointedAtByIPFG = "yellow"; // Foreground colour an address will be if it is at the address pointed to by the IP

export class MemoryView {
  public readonly screen: CustomScreen;
  public readonly cpu: CPU;
  private _rows: number = 7;
  private _cols: number = 30;
  private _startAddr: number = 0;
  private _base: number = 16; // What base do we show our numbers in?
  private _cache: IMemoryViewCache; // Cache measurements and stuff

  public constructor(wrapper: HTMLDivElement, cpu: CPU) {
    this.screen = new CustomScreen(wrapper);
    this.screen.updateFont(font => {
      font.family = "consolas";
      font.size = 11;
    });
    this.cpu = cpu;

    this._updateCache();
    this._render();
  }

  public get startAddress(): number { return this._startAddr; }
  public set startAddress(addr: number) { this._startAddr = addr; this._updateCache(); this._render(); }

  public get rows(): number { return this._rows; }
  public set rows(value: number) { this._rows = value; this._updateCache(); this._render(); }

  public get cols(): number { return this._cols; }
  public set cols(value: number) { this._cols = value; this._updateCache(); this._render(); }

  public get base(): number { return this._base; }
  public set base(value: number) { this._base = value; this._updateCache(); this._render(); }

  public updateScreen(callback: (S: CustomScreen) => void) {
    callback(this.screen);
    this._updateCache();
    this._render();
  }

  getAddressRange() {
    return [this._startAddr, this._startAddr + (this._rows * this._cols - 1)];
  }

  /** Maximum address we may show. */
  getMaxAddress() { return this.cpu.memorySize; }

  private _updateCache() {
    const ySpacing = this.screen.getHeight() / (this._cols + 1);
    const offsetLabelsLength = this.cpu.memorySize.toString(this._base).length, offsetLabelsDimensions = this.screen.measureText('0'.repeat(offsetLabelsLength) + ':');
    const rowTitleWidth = 5 + offsetLabelsDimensions.width;
    const xSpaceRemaining = this.screen.getWidth() - rowTitleWidth, xPad = 10;
    const xSpacing = (xSpaceRemaining - xPad * 2) / this._rows;

    const cache: IMemoryViewCache = { ySpacing, offsetLabelsLength, offsetLabelsDimensions, rowTitleWidth, xSpacing, xPad };
    this._cache = cache;
  }

  private _render() {
    const S = this.screen;
    S.clear();

    // Headers
    S.saveState();
    S.updateFont(font => {
      font.weight = 900;
    });
    S.setForeground("lime");

    S.y = this._cache.ySpacing / 3;
    // Column headers
    S.y = this._cache.ySpacing;
    S.x = this._cache.rowTitleWidth - this._cache.offsetLabelsDimensions.width;
    for (let col = 0, addr = this._startAddr; col < this._cols; col++, addr += this._rows) {
      let text = addr.toString(this._base).padStart(this._cache.offsetLabelsLength, '0') + ':';
      S.writeString(text, false);
      S.y += this._cache.ySpacing;
    }

    // Determine what space we've got left
    const startX = this._cache.rowTitleWidth + this._cache.xPad, startY = this._cache.ySpacing / 2 - 0.5 * this._cache.offsetLabelsDimensions.height;
    S.y = startY;
    S.x = startX;
    // Row headers
    for (let row = 0; row < this._rows; row++) {
      let text = row.toString(this._base).padStart(2, '0');
      S.writeString(text, false);
      S.x += this._cache.xSpacing;
    }
    S.restoreState();

    S.x = startX;
    S.y = this._cache.ySpacing;
    S.setForeground('lightgrey');
    const ip = this.cpu.readRegister("ip");
    // Address values
    for (let col = 0, addr = this._startAddr; col < this._cols; col++) {
      for (let row = 0; row < this._rows; row++, addr++) {
        let text: string, value: number;
        try {
          value = this.cpu.readMemory(addr);
          text = numberToString(this.cpu.numType, value, this._base)
        } catch {
          text = '-';
        }
        if (addr === ip) {
          withinState(this.screen, S => {
            S.setForeground(pointedAtByIPFG);
            S.writeString(text, false);
          });
        } else if (value == instructionSet.HALT.opcode) {
          withinState(this.screen, S => {
            S.setForeground('tomato');
            S.writeString(text, false);
          });
        } else {
          S.writeString(text, false);
        }
        S.x += this._cache.xSpacing;
      }
      S.y += this._cache.ySpacing;
      S.x = startX;
    }
  }

  private _renderAddress(address: number) {
    const relAddress = address - this.startAddress; // Address relative to where we are in the view
    const row = Math.floor(relAddress / this._rows);
    const col = relAddress - (row * this._rows);
    let x = (this._cache.rowTitleWidth + this._cache.xPad) + (col * this._cache.xSpacing);
    let y = this._cache.ySpacing + (row * this._cache.ySpacing);
    this.screen.x = x;
    this.screen.y = y;

    const value = this.cpu.readMemory(address);
    let text = numberToString(this.cpu.numType, value, this._base);
    if (address === this.cpu.readRegister("ip")) {
      withinState(this.screen, S => {
        S.setForeground(pointedAtByIPFG);
        S.writeString(text, false);
      });
    } else {
      this.screen.writeString(text, false);
    }
  }

  /** Update given address in MemortView. If not provided, everything will be updated */
  public update(address?: number) {
    if (typeof address === 'number') {
      this._renderAddress(address);
    } else {
      this._render();
    }
  }
}

export default MemoryView;