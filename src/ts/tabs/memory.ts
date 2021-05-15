import MemoryView from "../classes/MemoryView";
import RegisterView from "../classes/RegisterView";
import globals from "../globals";
import { IMemoryTabProperties, ITabInfo } from "../types/Tabs";
import { hex } from "../utils/general";

export const info: ITabInfo = {
  content: undefined,
  text: 'Memory',
  displayMulti: false,
};

export const properties: IMemoryTabProperties = {
  memoryView: undefined,
  memoryViewDimensions: [900, 600],
  registerView: undefined,
  registerViewDimensions: [200, 600],
  updateMemoryViewOnMemoryWrite: true,
};

/** For MemoryView */
function generateMemoryViewHTML(): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.classList.add('memory-view-wrapper');

  const viewDiv = document.createElement("div");
  const view = new MemoryView(viewDiv, globals.cpu);
  view.updateScreen(S => {
    S.setWidth(properties.memoryViewDimensions[0]);
    S.setHeight(properties.memoryViewDimensions[1]);
  });
  properties.memoryView = view;

  /// Edit memory
  let p = document.createElement("p"), addressViewing: number;
  wrapper.appendChild(p);
  /** Read value of given address */
  const inputtedAddress = (address: number | string) => {
    const addr = typeof address === 'string' ? parseInt(address, parseInt(selectBase.value)) : Math.floor(address);
    if (isNaN(addr)) {
      inputtedAddress(0);
    } else {
      addressViewing = addr;
      const decimal = globals.cpu.readMemory(addr);
      inputAddressValue.value = decimal.toString();
    }
  };
  p.insertAdjacentHTML('beforeend', 'Address ');
  let selectBase = document.createElement('select');
  selectBase.insertAdjacentHTML('beforeend', `<option value='16' title='Hexadecimal'>0x</option>`);
  selectBase.insertAdjacentHTML('beforeend', `<option value='10' title='Decimal'>0d</option>`);
  selectBase.insertAdjacentHTML('beforeend', `<option value='2' title='Binary'>0b</option>`);
  selectBase.insertAdjacentHTML('beforeend', `<option value='8' title='Octal'>0o</option>`);
  selectBase.addEventListener('change', () => inputtedAddress(inputAddress.value));
  p.appendChild(selectBase);
  let inputAddress = document.createElement("input");
  inputAddress.type = "text";
  inputAddress.value = "0";
  inputAddress.addEventListener('change', () => inputtedAddress(inputAddress.value));
  p.appendChild(inputAddress);
  p.insertAdjacentHTML('beforeend', ' &equals; ');
  let inputAddressValue = document.createElement("input");
  inputAddressValue.type = "number";
  inputAddressValue.addEventListener('change', () => {
    // Write to address
    const decimal = +inputAddressValue.value;
    if (!isNaN(decimal) && isFinite(decimal)) {
      globals.cpu.writeMemory(addressViewing, decimal);
    }
    inputtedAddress(inputAddress.value); // Reset
  });
  p.appendChild(inputAddressValue);
  inputtedAddress(0);

  /// Buttons
  p = document.createElement("p");
  wrapper.appendChild(p);
  // Start button - go to start
  const btnStart = document.createElement("button");
  btnStart.innerText = '0';
  p.appendChild(btnStart);
  btnStart.addEventListener('click', () => {
    view.startAddress = 0;
    updateGUI();
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
  });
  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp;&nbsp;&nbsp; ');

  // Show current address range
  const addressRange = document.createElement("code");
  const updateGUI = () => {
    // addressRange HTML
    const pad = view.getMaxAddress().toString(view.base).length;
    const [min, max] = view.getAddressRange();
    const range = `${min.toString(view.base).padStart(pad, '0')} - ${max.toString(view.base).padStart(pad, '0')}`;
    addressRange.innerText = range;
    btnEnd.innerText = view.getMaxAddress().toString(view.base);
    inputAddress.value = view.startAddress.toString(view.base);
    inputtedAddress(view.startAddress);
    btnSetInRange.innerText = 'Set ' + range;

    // Limiting buttons
    if (view.startAddress <= 0) {
      btnBack.setAttribute("disabled", "disabled");
    } else {
      btnBack.removeAttribute("disabled");
    }
    if (view.startAddress + (max - min) >= view.getMaxAddress()) {
      btnForward.setAttribute("disabled", "disabled");
    } else {
      btnForward.removeAttribute("disabled");
    }
  };
  p.appendChild(addressRange);

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
    view.startAddress = view.getMaxAddress() - (max - min);
    updateGUI();
  });

  // Set memory in range/all
  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp; | &nbsp;&nbsp; ');
  let btnSetInRange = document.createElement("button");
  btnSetInRange.addEventListener('click', () => {
    const [min, max] = view.getAddressRange();
    const number = +inputSetValue.value;
    globals.cpu.writeMemoryBulk(min, max, number);
  });
  p.appendChild(btnSetInRange);
  let btnSetAll = document.createElement("button");
  btnSetAll.innerText = 'Set All';
  btnSetAll.addEventListener('click', () => {
    const number = +inputSetValue.value;
    globals.cpu.writeMemoryBulk(0, globals.cpu.memorySize, number);
  });
  p.appendChild(btnSetAll);
  p.insertAdjacentHTML('beforeend', ' &nbsp;to ');
  let inputSetValue = document.createElement("input");
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

  // Append MemoryViewer to screen
  wrapper.appendChild(viewDiv);

  p = document.createElement("p");
  wrapper.appendChild(p);
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
  // Numeric base
  p.insertAdjacentHTML('beforeend', ' &nbsp;|&nbsp; Base: ');
  let inputBase = document.createElement("input");
  inputBase.type = "number";
  inputBase.min = "2";
  inputBase.max = "37";
  inputBase.value = view.base.toString();
  p.appendChild(inputBase);
  inputBase.addEventListener('change', () => {
    const base = parseInt(inputBase.value);
    if (base >= +inputBase.min && base < +inputBase.max) {
      // This links to both views
      properties.memoryView.base = base;
      properties.registerView.base = base;
      updateGUI();
    } else {
      inputBase.value = view.base.toString();
    }
  });


  updateGUI();

  return wrapper;
}

function generateRegisterViewHTML(): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.classList.add('register-view-wrapper');

  const viewWrapper = document.createElement("div");
  const view = new RegisterView(viewWrapper, globals.cpu);
  view.updateScreen(S => {
    S.setWidth(properties.registerViewDimensions[0]);
    S.setHeight(properties.registerViewDimensions[1]);
  });
  properties.registerView = view;

  // Edit content
  let p = document.createElement("p");
  wrapper.appendChild(p);
  p.insertAdjacentHTML('beforeend', 'Register ');
  const selectedRegister = (index: number) => {
    const value = globals.cpu.readRegister(index);
    inputRegisterValue.value = value.toString(); // View decimal value
  };
  let selectRegister = document.createElement("select");
  for (let i = 0; i < globals.cpu.registerMap.length; i++) {
    const name = globals.cpu.registerMap[i];
    selectRegister.insertAdjacentHTML('beforeend', `<option value='${i}'>${name}</option>`);
  }
  selectRegister.addEventListener('change', () => selectedRegister(+selectRegister.value));
  p.appendChild(selectRegister);
  p.insertAdjacentHTML('beforeend', ' &equals; ');
  let inputRegisterValue = document.createElement("input");
  inputRegisterValue.type = "number";
  inputRegisterValue.min = "0";
  inputRegisterValue.max = globals.cpu.memorySize.toString();
  inputRegisterValue.addEventListener('change', () => {
    let value = +inputRegisterValue.value;
    if (!isNaN(value) && isFinite(value)) {
      globals.cpu.writeRegister(+selectRegister.value, value);
      if (+selectRegister.value === globals.cpu.registerMap.indexOf("ip")) globals.memoryView.update();
    } else {
      selectedRegister(+selectRegister.value); // Reset input
    }
  });
  p.appendChild(inputRegisterValue);

  // Reset registers
  p = document.createElement("p");
  wrapper.appendChild(p);
  const btnClear = document.createElement("button");
  btnClear.innerText = 'Clear Registers';
  p.appendChild(btnClear);
  btnClear.addEventListener('click', () => {
    for (let r = 0; r < globals.cpu.registerMap.length; r++) {
      globals.cpu.writeRegister(r, 0);
    }
  });

  selectedRegister(0);
  wrapper.appendChild(viewWrapper);

  return wrapper;
}

export function init() {
  const content = document.createElement("div");
  info.content = content;

  const flexContainer = document.createElement("div");
  content.appendChild(flexContainer);
  flexContainer.classList.add('flex-container');

  const memoryViewHTML = generateMemoryViewHTML();
  memoryViewHTML.classList.add('flex-child');
  memoryViewHTML.insertAdjacentHTML('afterbegin', `<h2>Memory</h2>`);
  flexContainer.appendChild(memoryViewHTML);

  const registerViewHTML = generateRegisterViewHTML();
  registerViewHTML.classList.add('flex-child');
  registerViewHTML.insertAdjacentHTML('afterbegin', `<h2>Registers</h2>`);
  flexContainer.appendChild(registerViewHTML);

  const ipIndex = globals.cpu.registerMap.indexOf("ip");
  // Callbacks
  globals.cpu.onMemoryWrite((startAddress, endAddress) => {
    if (startAddress === endAddress) {
      properties.memoryView.update(startAddress);
    } else {
      properties.memoryView.update();
    }
  });
  globals.cpu.onRegisterWrite((index, value, cpu) => {
    properties.registerView.update(index);
    if (properties.updateMemoryViewOnMemoryWrite) properties.memoryView.update();
    if (index === ipIndex) globals.tabs.run.instructionPointer.innerText = "0x" + hex(value);
  });
}