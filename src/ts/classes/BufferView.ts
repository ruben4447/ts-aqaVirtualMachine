import { ITextMeasurements } from "../types/general";
import { clamp, downloadBlob, downloadTextFile, readBinaryFile } from "../utils/general";
import { withinState } from "../utils/Screen";
import CustomScreen from "./Screen";

export interface IMemoryViewCache {
  ySpacing: number;
  offsetLabelsLength: number; // Padding of '0's required on hexadecimal addresses
  offsetLabelsDimensions: ITextMeasurements;
  rowTitleWidth: number;
  xSpacing: number;
  xPad: number;
}

export class BufferView {
  public readonly screen: CustomScreen;
  private _data: DataView;

  private _rows = 20;
  private _cols = 20;
  private _base = 16;
  private _cache: IMemoryViewCache;
  private _startAddr = 0;

  public colorAddresses = new Map<number, string>();

  constructor(wrapper: HTMLDivElement, dataView: DataView) {
    this.screen = new CustomScreen(wrapper);
    this.screen.updateFont(font => {
      font.family = "consolas";
      font.size = 11;
    });
    this._data = dataView;

    this._updateCache();
    this._render();
  }

  public get length() { return this._data.byteLength; }

  public get startAddress(): number { return this._startAddr; }
  public set startAddress(addr: number) { this._startAddr = addr; this._updateCache(); this._render(); }

  public get rows(): number { return this._rows; }
  public set rows(value: number) { this._rows = value; this._updateCache(); this._render(); }

  public get cols(): number { return this._cols; }
  public set cols(value: number) { this._cols = value; this._updateCache(); this._render(); }

  public get base(): number { return this._base; }
  public set base(value: number) { this._base = value; this._updateCache(); this._render(); }

  /** Change data view */
  public setDataView(dataView: DataView) {
    this._data = dataView;
    this._updateCache();
    this._render();
  }

  public updateScreen(callback: (S: CustomScreen) => void) {
    callback(this.screen);
    this._updateCache();
    this._render();
  }

  /** View address range covered by the current screen */
  public getAddressRange() {
    return [this._startAddr, this._startAddr + (this._rows * this._cols - 1)];
  }

  private _updateCache() {
    const ySpacing = this.screen.getHeight() / (this._cols + 1);
    const offsetLabelsLength = this.getAddressRange()[1].toString(this._base).length, offsetLabelsDimensions = this.screen.measureText('0'.repeat(offsetLabelsLength) + ':');
    const rowTitleWidth = 5 + offsetLabelsDimensions.width;
    const xSpaceRemaining = this.screen.getWidth() - rowTitleWidth, xPad = 10;
    const xSpacing = (xSpaceRemaining - xPad * 2) / this._rows;

    const cache: IMemoryViewCache = { ySpacing, offsetLabelsLength, offsetLabelsDimensions, rowTitleWidth, xSpacing, xPad };
    this._cache = cache;
  }

  /** Render headers and all addresses on current page */
  private _render() {
    const S = this.screen, D = this._data;
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
    const maxLength = (255).toString(this._base).length;
    // Address values
    for (let col = 0, addr = this._startAddr; col < this._cols; col++) {
      for (let row = 0; row < this._rows; row++, addr++) {
        if (addr >= 0 && addr < D.byteLength) {
          let value = D.getUint8(addr);
          let text = value.toString(this.base).padStart(maxLength, '0');
          if (this.colorAddresses.has(addr)) {
            withinState(this.screen, S => {
              S.setForeground(this.colorAddresses.get(addr));
              S.writeString(text, false);
            });
          } else {
            S.writeString(text, false);
          }
        } else {
          S.writeString('-', false);
        }
        S.x += this._cache.xSpacing;
      }
      S.y += this._cache.ySpacing;
      S.x = startX;
    }
  }

  /** Render a single address */
  private _renderAddress(address: number) {
    const relAddress = address - this.startAddress; // Address relative to where we are in the view
    const row = Math.floor(relAddress / this._rows);
    const col = relAddress - (row * this._rows);
    let x = (this._cache.rowTitleWidth + this._cache.xPad) + (col * this._cache.xSpacing);
    let y = this._cache.ySpacing + (row * this._cache.ySpacing);
    this.screen.x = x;
    this.screen.y = y;

    if (relAddress >= 0 && relAddress < this.length) {
      const value = this._data.getUint8(address);
      const maxLength = (255).toString(this._base).length;
      let text = value.toString(this.base).padStart(maxLength, '0');
      if (this.colorAddresses.has(address)) {
        withinState(this.screen, S => {
          S.setForeground(this.colorAddresses.get(address));
          S.writeString(text, false);
        });
      } else {
        this.screen.writeString(text, false);
      }
    } else {
      this.screen.writeString('-', false);
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

export interface IControlOptions {
  wrapper: HTMLDivElement;
  dataView: DataView;
  onupdate?: (dataView: DataView) => void
  editable?: boolean;
  resizable?: boolean;
  colorCurrent?: string;
}

export interface IControlReturnData {
  wrapper: HTMLDivElement;
  dataView: DataView;
  view: BufferView;
  updateGUI: () => void;
}

/** HTML template a controls for MemoryView */
export function generateControl(options: IControlOptions) {
  options.editable ??= true;
  options.resizable ??= true;
  options.onupdate ??= d => void 0;
  options.colorCurrent ??= 'yellow';

  const viewDiv = document.createElement("div");
  const view = new BufferView(viewDiv, options.dataView);
  const DATA = { wrapper: options.wrapper, view, dataView: options.dataView, updateGUI } as IControlReturnData;

  /// Edit memory
  let p = document.createElement("p"), addressViewing: number;
  options.wrapper.appendChild(p);
  /** Read value of given address */
  const inputtedAddress = (address: number | string) => {
    const addr = typeof address === 'string' ? parseInt(address) : Math.floor(address);
    if (isNaN(addr)) {
      inputtedAddress(0);
    } else {
      view.colorAddresses.delete(addressViewing);
      addressViewing = addr;
      view.colorAddresses.set(addressViewing, options.colorCurrent);
      if (addr >= 0 && addr < view.length) {
        const decimal = DATA.dataView.getUint8(addr);
        inputAddressValue.value = decimal.toString();
      } else {
        inputAddressValue.value = '0';
      }
    }
  };
  p.insertAdjacentHTML('beforeend', 'Address ');
  let inputAddress = document.createElement("input");
  inputAddress.type = "number";
  inputAddress.value = "0";
  inputAddress.min = "0";
  inputAddress.addEventListener('change', () => {
    inputtedAddress(inputAddress.value);
    view.update();
  });
  p.appendChild(inputAddress);
  p.insertAdjacentHTML('beforeend', ' &equals; ');
  let inputAddressValue = document.createElement("input");
  inputAddressValue.type = "number";
  inputAddressValue.addEventListener('change', () => {
    // Write to address
    const decimal = +inputAddressValue.value;
    if (options.editable && !isNaN(decimal) && isFinite(decimal) && addressViewing >= 0 && addressViewing < view.length) {
      DATA.dataView.setUint8(addressViewing, decimal);
      view.update(addressViewing);
      updateGUI();
      options.onupdate(DATA.dataView);
    }
    inputtedAddress(inputAddress.value); // Reset
  });
  if (!options.editable) inputAddressValue.readOnly = true;
  p.appendChild(inputAddressValue);
  inputtedAddress(0);

  // Size
  p.insertAdjacentHTML("beforeend", "&nbsp; &nbsp;|&nbsp; &nbsp;Size: ");
  let inputSize = document.createElement("input");
  inputSize.type = "number";
  inputSize.min = "0";
  if (options.editable && options.resizable) {
    inputSize.addEventListener("change", () => {
      let size = parseInt(inputSize.value);
      if (size >= 0 && size !== view.length) {
        let buff: ArrayBuffer;
        if (size < view.length) {
          buff = DATA.dataView.buffer.slice(0, size);
        } else {
          buff = new ArrayBuffer(size);
          new Uint8Array(buff).set(new Uint8Array(DATA.dataView.buffer), 0);
        }
        DATA.dataView = new DataView(buff);
        options.onupdate(DATA.dataView);
        view.setDataView(DATA.dataView);
        view.update();
      }
      updateGUI();
    });
  } else {
    inputSize.readOnly = true;
  }
  p.appendChild(inputSize);

  /// Buttons
  p = document.createElement("p");
  options.wrapper.appendChild(p);
  // Start button - go to start
  const btnStart = document.createElement("button");
  btnStart.innerText = '0';
  p.appendChild(btnStart);
  btnStart.addEventListener('click', () => {
    view.startAddress = 0;
    updateGUI();
    view.update();
  });
  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp;');
  // Back button - go back an address page
  const btnBack = document.createElement("button");
  btnBack.innerHTML = '&larr;';
  p.appendChild(btnBack);
  btnBack.addEventListener('click', () => {
    view.startAddress -= view.rows * view.cols;
    if (view.startAddress < 0) view.startAddress = 0;
    updateGUI();
    view.update();
  });
  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp;&nbsp;&nbsp; ');

  // Show current address range
  const addressRange = document.createElement("code");
  p.appendChild(addressRange);

  // Update all GUI elements
  function updateGUI() {
    // addressRange HTML
    const pad = view.length.toString(view.base).length;
    const [min, max] = view.getAddressRange();
    const range = `${min.toString(view.base).padStart(pad, '0')} - ${max.toString(view.base).padStart(pad, '0')}`;
    addressRange.innerText = range;
    inputAddress.max = view.length.toString();
    view.colorAddresses.delete(addressViewing);
    addressViewing = clamp(0, view.length, addressViewing);
    view.colorAddresses.set(addressViewing, options.colorCurrent);
    btnEnd.innerText = view.length.toString(view.base);
    inputAddress.value = addressViewing.toString();
    inputtedAddress(addressViewing);
    inputSize.value = view.length.toString();
    if (options.editable) {
      btnSetInRange.innerText = range;
    }

    // Limiting buttons
    if (view.startAddress <= 0) {
      btnBack.setAttribute("disabled", "disabled");
    } else {
      btnBack.removeAttribute("disabled");
    }
    if (view.startAddress + (max - min) >= view.length) {
      btnForward.setAttribute("disabled", "disabled");
    } else {
      btnForward.removeAttribute("disabled");
    }
  }

  // Forward button - go forward an address page
  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp;&nbsp;&nbsp; ');
  const btnForward = document.createElement("button");
  btnForward.innerHTML = '&rarr;';
  btnForward.addEventListener('click', () => {
    view.startAddress += view.rows * view.cols;
    updateGUI();
  });
  p.appendChild(btnForward);

  // End button - go to end
  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp;');
  const btnEnd = document.createElement("button");
  p.appendChild(btnEnd);
  btnEnd.addEventListener('click', () => {
    const [min, max] = view.getAddressRange();
    view.startAddress = view.length - (max - min);
    updateGUI();
    view.update();
  });

  // Set memory in range/all
  let btnSetInRange: HTMLButtonElement, btnSetAll: HTMLButtonElement, btnSetInputRange: HTMLButtonElement, inputSetValue: HTMLInputElement;
  if (options.editable) {
    p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp; | &nbsp;&nbsp; Set ');
    btnSetInRange = document.createElement("button");
    btnSetInRange.addEventListener('click', () => {
      let [min, max] = view.getAddressRange();
      min = Math.max(0, min);
      max = Math.min(view.length, max);
      const number = +inputSetValue.value;
      for (let i = min; i < max; ++i) {
        DATA.dataView.setUint8(i, number);
      }
      updateGUI();
      view.update();
      options.onupdate(DATA.dataView);
    });
    p.appendChild(btnSetInRange);
    btnSetAll = document.createElement("button");
    btnSetAll.innerText = 'All';
    btnSetAll.addEventListener('click', () => {
      const number = +inputSetValue.value;
      for (let i = 0; i < DATA.dataView.byteLength; ++i) {
        DATA.dataView.setUint8(i, number);
      }
      updateGUI();
      view.update();
      options.onupdate(DATA.dataView);
    });
    p.appendChild(btnSetAll);
    btnSetInputRange = document.createElement("button");
    btnSetInputRange.innerText = 'Range';
    btnSetInputRange.addEventListener('click', () => {
      let range = view.getAddressRange(), rangeInput = prompt(`Range of addresses to set`, range.join(', '));
      if (rangeInput === null) return;
      if (rangeInput) {
        let parsed = rangeInput.split(',').map(n => parseInt(n));
        range[0] = parsed[0];
        range[1] = parsed[1];
        if (parsed.length !== 2 || range[0] > range[1] || range[0] < 0 || range[1] > view.length) return alert(`Invalid range.`);
      }
      const number = +inputSetValue.value;
      for (let i = range[0]; i < range[1]; ++i) {
        DATA.dataView.setUint8(i, number);
      }
      view.colorAddresses.delete(addressViewing);
      addressViewing = range[0];
      updateGUI();
      view.update();
      options.onupdate(DATA.dataView);
    });
    p.appendChild(btnSetInputRange);
    p.insertAdjacentHTML('beforeend', ' &nbsp;to ');
    inputSetValue = document.createElement("input");
    inputSetValue.type = "number";
    inputSetValue.value = "0";
    inputSetValue.addEventListener('change', () => {
      let value = +inputSetValue.value;
      if (isNaN(value) || !isFinite(value)) {
        inputSetValue.value = "0";
      } else {
        inputSetValue.value = value.toString();
      }
    })
    p.appendChild(inputSetValue);
  }

  // Append MemoryViewer to screen
  options.wrapper.appendChild(viewDiv);

  p = document.createElement("p");
  options.wrapper.appendChild(p);
  // Row count
  p.insertAdjacentHTML('beforeend', 'Rows: ');
  let inputRows = document.createElement("input");
  inputRows.type = "number";
  inputRows.min = "1";
  inputRows.max = "50";
  inputRows.value = view.rows.toString();
  p.appendChild(inputRows);
  inputRows.addEventListener('change', () => {
    const rows = parseInt(inputRows.value);
    if (rows >= +inputRows.min && rows < +inputRows.max) {
      view.rows = rows;
      updateGUI();
    } else {
      inputRows.value = view.rows.toString();
    }
  });
  // Col count
  p.insertAdjacentHTML('beforeend', ' &nbsp;|&nbsp; Cols: ');
  let inputCols = document.createElement("input");
  inputCols.type = "number";
  inputCols.min = "1";
  inputCols.max = "75";
  inputCols.value = view.cols.toString();
  p.appendChild(inputCols);
  inputCols.addEventListener('change', () => {
    const cols = parseInt(inputCols.value);
    if (cols >= +inputCols.min && cols < +inputCols.max) {
      view.cols = cols;
      updateGUI();
    } else {
      inputCols.value = view.cols.toString();
    }
  });
  // Download as file
  p.insertAdjacentHTML('beforeend', ' &nbsp;|&nbsp; ');
  let btnDownload = document.createElement("button");
  btnDownload.innerText = 'Download';
  btnDownload.addEventListener('click', () => {
    let range = [0, view.length], rangeInput = prompt(`Range of bytes to download`, range.join(', '));
    if (rangeInput === null) return;
    if (rangeInput) {
      let parsed = rangeInput.split(',').map(n => parseInt(n));
      range[0] = parsed[0];
      range[1] = parsed[1];
      if (parsed.length !== 2 || range[0] > range[1] || range[0] < 0 || range[1] > view.length) return alert(`Invalid range.`);
    }
    downloadBlob(DATA.dataView.buffer.slice(range[0], range[1]), 'data.bin', 'application/octet-stream');
  });
  p.appendChild(btnDownload);
  p.insertAdjacentHTML('beforeend', ' &nbsp;');
  let btnDownloadText = document.createElement("button");
  btnDownloadText.innerText = 'Download as Text';
  btnDownloadText.addEventListener('click', () => {
    let range = [0, view.length], rangeInput = prompt(`Range of bytes to convert`, range.join(', '));
    if (rangeInput === null) return;
    if (rangeInput) {
      let parsed = rangeInput.split(',').map(n => parseInt(n));
      range[0] = parsed[0];
      range[1] = parsed[1];
      if (parsed.length !== 2 || range[0] > range[1] || range[0] < 0 || range[1] > view.length) return alert(`Invalid range.`);
    }
    let dec = new TextDecoder();
    let text = dec.decode(DATA.dataView.buffer.slice(range[0], range[1]));
    downloadTextFile(text, 'data.txt');
  });
  p.appendChild(btnDownloadText);
  // Upload a file
  if (options.editable) {
    let inputUpload = document.createElement('input');
    inputUpload.type = 'file';
    inputUpload.addEventListener('input', async () => {
      const file = inputUpload.files[0];
      if (file) {
        let buff = await readBinaryFile(file);
        if (!options.resizable && buff.byteLength !== DATA.dataView.byteLength) return alert(`Uploaded file must contain ${DATA.dataView.byteLength} bytes; got ${buff.byteLength} bytes`);
        DATA.dataView = new DataView(buff);
        view.setDataView(DATA.dataView);
        options.onupdate(DATA.dataView);
        updateGUI();
      }
    });

    p.insertAdjacentHTML('beforeend', ' &nbsp;');
    let btnUpload = document.createElement('button');
    btnUpload.innerText = 'Upload';
    btnUpload.addEventListener('click', () => inputUpload.click());
    p.appendChild(btnUpload);
  }

  updateGUI();

  return DATA;
}