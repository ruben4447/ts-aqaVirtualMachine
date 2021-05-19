import Popup from "../classes/Popup";
import globals from "../globals";
import { NumberType } from "../types/general";
import { ICPUTabProperties, ITabInfo } from "../types/Tabs";
import { getMinMaxValues, numberToString, numericTypes, seperateNumber } from "../utils/general";
import { __app_init_ } from "../_main";
import { updateGUI } from "./memory";

export const info: ITabInfo = {
  content: undefined,
  text: 'CPU',
  displayMulti: true,
};

export const properties: ICPUTabProperties = {
  content: undefined, // Dynamic content
};

function generateHTML(): HTMLDivElement {
  const wrapper = document.createElement("div");
  let div: HTMLDivElement, p: HTMLParagraphElement;

  wrapper.insertAdjacentHTML('beforeend', `<p><em><b>Note</b> that changing any settings on this page will cause the manufacture of a new Processor and therefore all entered programmes, memory/register states etc. will be lost.</em></p>`);

  // wrapper.insertAdjacentHTML('beforeend', '<h3>Instruction Set</h3>');
  // p = document.createElement("p");
  // wrapper.appendChild(p);
  // let link = createLink('View instruction set here');
  // link.addEventListener('click', () => globals.tabs._.open('instructionSet'));
  // p.appendChild(link);

  // Numeric Representation
  div = document.createElement("div");
  wrapper.appendChild(div);
  div.insertAdjacentHTML('beforeend', '<h3>Numeric Representation</h3>');
  p = document.createElement("p");
  div.appendChild(p);
  p.insertAdjacentHTML('beforeend', '<abbr title=\'What base representation to display numbers as (memory view, register view, ...)\'>Numeric Base</abbr>: ');
  const inputBase = document.createElement("input");
  inputBase.type = "number";
  inputBase.value = globals.base.toString();
  inputBase.min = '2';
  inputBase.max = '36';
  inputBase.addEventListener('change', () => {
    let base = parseInt(inputBase.value);
    if (!isNaN(base) && base >= parseInt(inputBase.min) && base <= parseInt(inputBase.max)) {
      updateBase(base);
    } else {
      inputBase.value = globals.base.toString();
    }
  })
  p.appendChild(inputBase);

  let table = document.createElement('table'), tbody = document.createElement('tbody');
  div.appendChild(table);
  table.appendChild(tbody);
  let tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', '<th>Data Type</th>');
  let td = document.createElement('td');
  tr.appendChild(td);
  const selectDataType = document.createElement('select');
  td.appendChild(selectDataType);
  selectDataType.insertAdjacentHTML('beforeend', `<option value='${globals.cpu.numType.type}'>${globals.cpu.numType.type}</option>`);
  for (const type of numericTypes) {
    if (type !== globals.cpu.numType.type) {
      selectDataType.insertAdjacentHTML('beforeend', `<option value='${type}'>${type}</option>`);
    }
  }
  selectDataType.addEventListener('change', () => {
    updateCPU(selectDataType.value as NumberType, undefined);
  });

  tbody.insertAdjacentHTML('beforeend', `<tr><th>Bytes per <a target="_blank" href="https://en.wikipedia.org/wiki/Word_(computer_architecture)">Word</a></th><td><code>${globals.cpu.numType.bytes}</code></td></tr>`);

  // MIN/MAX VALUES
  const [minVal, maxVal] = getMinMaxValues(globals.cpu.numType);
  tbody.insertAdjacentHTML('beforeend', `<tr><th>Minimum</th><td><code>${seperateNumber(minVal)} (${numberToString(globals.cpu.numType, minVal, globals.base)})<sub>${globals.base}</sub></code></td></tr>`);
  tbody.insertAdjacentHTML('beforeend', `<tr><th>Maximum</th><td><code>${seperateNumber(maxVal)} (${numberToString(globals.cpu.numType, maxVal, globals.base)})<sub>${globals.base}</sub></code></td></tr>`);


  // Memory
  div = document.createElement("div");
  wrapper.appendChild(div);
  div.insertAdjacentHTML('beforeend', '<h3>Memory</h3>');
  table = document.createElement('table');
  wrapper.appendChild(table);
  tbody = document.createElement('tbody');
  table.appendChild(tbody);

  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', '<th>Capacity (words)</th>');
  td = document.createElement('td');
  tr.appendChild(td);
  const inputMemorySize = document.createElement('input');
  inputMemorySize.type = "number";
  inputMemorySize.value = globals.cpu.memorySize.toString();
  inputMemorySize.min = globals.cpu.numType.bytes.toString();
  inputMemorySize.addEventListener('change', () => {
    let size = parseInt(inputMemorySize.value);
    if (!isNaN(size) || !isFinite(size) && size > parseInt(inputMemorySize.min)) {
      updateCPU(undefined, size);
    } else {
      inputMemorySize.value = size.toString();
    }
  });
  td.appendChild(inputMemorySize);
  td.insertAdjacentHTML('beforeend', ` &nbsp; <code>(${numberToString(globals.cpu.numType, globals.cpu.memorySize, globals.base)})<sub>${globals.base}</sub></code>`);

  const memoryBytes = globals.cpu.memorySizeBytes();
  tbody.insertAdjacentHTML('beforeend', `<tr><th>Capacity (bytes)</th><td><code>${seperateNumber(memoryBytes)} (${numberToString(globals.cpu.numType, memoryBytes, globals.base)})<sub>${globals.base}</sub></code></td></tr>`);

  let usablePercent = (maxVal / globals.cpu.memorySize) * 100;
  if (usablePercent >= 100) usablePercent = 100;
  tbody.insertAdjacentHTML('beforeend', `<tr><th>Addressable Memory</th><td><code>${seperateNumber(maxVal)} addresses (${usablePercent.toFixed(2)}%)</code></td></tr>`);

  // Registers
  div = document.createElement("div");
  wrapper.appendChild(div);
  div.insertAdjacentHTML('beforeend', '<h3>Registers (<small>' + globals.cpu.registerMap.length + '</small>)</h3>');
  table = document.createElement('table');
  wrapper.appendChild(table);
  tbody = document.createElement('tbody');
  table.appendChild(tbody);

  tbody.insertAdjacentHTML('beforeend', `<th>Registers</th><td><strong>${globals.cpu.registerMap.length}</strong>: ${globals.cpu.registerMap.map(x => '\'' + x + '\'').join(', ')}</td>`);
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  td = document.createElement('td');
  tr.appendChild(td);
  const inputNewRegister = document.createElement('input');
  inputNewRegister.type = "text";
  inputNewRegister.minLength = 2;
  inputNewRegister.maxLength = 6;
  inputNewRegister.placeholder = 'Register';
  td.appendChild(inputNewRegister);
  tr.insertAdjacentHTML('afterbegin', `<th><abbr title='Must be a unique name and between ${inputNewRegister.minLength}-${inputNewRegister.maxLength} characters. Must not contain spaces, or start with a number.'>New Register</abbr></th>`);
  const btnCreateRegister = document.createElement('button');
  btnCreateRegister.innerText = '+';
  td.appendChild(btnCreateRegister);
  btnCreateRegister.addEventListener('click', () => {
    let name = inputNewRegister.value;
    if (name.length < +inputNewRegister.minLength || name.length > +inputNewRegister.maxLength || globals.cpu.registerMap.indexOf(name) !== -1 || name.match(/\s/) || !isNaN(parseInt(name[0]))) {
      new Popup('Invalid Register Name').insertAdjacentText('beforeend', `The inputted register name is invalid. Check: is it too long/short, or does it already exist?`).show();
      inputNewRegister.value = '';
    } else {
      updateCPU(undefined, undefined, [...globals.cpu.registerMap, name]);
    }
  });

  // Options
  div = document.createElement("div");
  wrapper.appendChild(div);
  div.insertAdjacentHTML('beforeend', '<h3>Options</h3>');
  table = document.createElement('table');
  div.appendChild(table);
  tbody = document.createElement('tbody');
  table.appendChild(tbody);

  // Safe NULL
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='HALT program execution on a NULL instruction'>Safe NULL</abbr></th>`);
  td = document.createElement("td");
  tr.appendChild(td);
  const inputSafeNull = document.createElement("input");
  inputSafeNull.type = "checkbox";
  inputSafeNull.checked = globals.cpu.executionConfig.haltOnNull;
  inputSafeNull.addEventListener('change', () => globals.cpu.executionConfig.haltOnNull = inputSafeNull.checked);
  td.appendChild(inputSafeNull);

  // Execution Feedback - Commentary
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='Provide commentary in execution feedback'>Commentary</abbr></th>`);
  td = document.createElement("td");
  tr.appendChild(td);
  const inputCommentary = document.createElement("input");
  inputCommentary.type = "checkbox";
  inputCommentary.checked = globals.cpu.executionConfig.commentary;
  inputCommentary.addEventListener('change', () => globals.cpu.executionConfig.commentary = inputCommentary.checked);
  td.appendChild(inputCommentary);

  // Assemble program - memory offset
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='When loading a program into memory, what address should it be inserted at?'>Program Start Address</abbr></th>`);
  td = document.createElement("td");
  tr.appendChild(td);
  const inputInsertAddress = document.createElement("input");
  inputInsertAddress.type = "number";
  inputInsertAddress.min = '0';
  inputInsertAddress.value = globals.assembler.startAddress.toString();
  inputInsertAddress.max = globals.cpu.memorySize.toString();
  inputInsertAddress.addEventListener('change', () => {
    let addr = parseInt(inputInsertAddress.value);
    if (isNaN(addr) || !isFinite(addr) || addr < parseInt(inputInsertAddress.min) || addr >= parseInt(inputInsertAddress.max)) {
      inputInsertAddress.value = globals.assembler.startAddress.toString();
    } else {
      globals.assembler.startAddress = addr;
      inputInsertAddress.value = addr.toString();
    }
  });
  td.appendChild(inputInsertAddress);

  // Show partial translation
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='Show Partial Translation section in "code" tab'>Show Partial Translation</abbr></th>`);
  td = document.createElement("td");
  tr.appendChild(td);
  const inputPartialTranslation = document.createElement("input");
  inputPartialTranslation.type = "checkbox";
  inputPartialTranslation.checked = globals.tabs.code.partailTranslationWrapper.style.display !== "none";
  inputPartialTranslation.addEventListener('change', () => {
    if (inputPartialTranslation.checked) {
      globals.tabs.code.partailTranslationWrapper.style.display = "block";
    } else {
      globals.tabs.code.partailTranslationWrapper.style.display = "none";
    }
  });
  td.appendChild(inputPartialTranslation);

  return wrapper;
}

export function updateBase(base: number) {
  globals.base = base;
  populate();

  globals.memoryView.base = base;
  globals.registerView.base = base;
  updateGUI();
}

function updateCPU(numType?: NumberType, memorySize?: number, registerMap?: string[]) {
  if (numType === undefined) numType = globals.cpu.numType.type;
  if (memorySize === undefined) memorySize = globals.cpu.memorySize;
  if (registerMap === undefined) registerMap = globals.cpu.registerMap;
  __app_init_({
    instructionSet: globals.cpu.instructionSet,
    numType: numType,
    memory: memorySize,
    registerMap,
  });

  globals.tabs._.open("cpu");
}

export function populate() {
  info.content.innerHTML = '';

  info.content.insertAdjacentHTML('beforeend', '<h2>CPU Properties</h2>');

  info.content.appendChild(generateHTML());
}

export function init() {
  const content = document.createElement("div");
  info.content = content;

  populate();
}