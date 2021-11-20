import Popup from "../classes/Popup";
import globals from "../globals";
import { CPUModel } from "../types/CPU";
import { NumberType } from "../types/general";
import { ICPUTabProperties, ITabInfo } from "../types/Tabs";
import { booleanToHTML, getMinMaxValues, numberToString, numericTypes, seperateNumber, numericTypeToObject } from "../utils/general";
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

  // CPU Model
  div = document.createElement("div");
  wrapper.appendChild(div);
  div.insertAdjacentHTML('beforeend', '<h3>CPU Model</h3>');
  p = document.createElement("p");
  div.appendChild(p);
  const selectCPUModel = document.createElement("select");
  for (const model in CPUModel) {
    if (CPUModel.hasOwnProperty(model)) {
      const value = CPUModel[model];
      selectCPUModel.insertAdjacentHTML('beforeend', `<option value='${model}'${value === globals.cpu.model ? ` selected='selected'` : ``}>${value}</option>`);
    }
  }
  selectCPUModel.addEventListener('change', () => {
    updateCPU(CPUModel[selectCPUModel.value]);
  });
  p.appendChild(selectCPUModel);

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
  tr.insertAdjacentHTML('beforeend', '<th title=\'Default data type of processor\'>Data Type</th>');
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
    updateCPU(undefined, selectDataType.value as NumberType, undefined);
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
  tr.insertAdjacentHTML('beforeend', '<th>Bytes</th>');
  td = document.createElement('td');
  tr.appendChild(td);
  const inputMemorySize = document.createElement('input');
  inputMemorySize.type = "number";
  inputMemorySize.value = globals.cpu.memorySize.toString();
  inputMemorySize.min = globals.cpu.numType.bytes.toString();
  inputMemorySize.addEventListener('change', () => {
    let size = parseInt(inputMemorySize.value);
    if (!isNaN(size) || !isFinite(size) && size > parseInt(inputMemorySize.min)) {
      updateCPU(undefined, undefined, size);
    } else {
      inputMemorySize.value = size.toString();
    }
  });
  td.appendChild(inputMemorySize);
  td.insertAdjacentHTML('beforeend', ` &nbsp; <code>(${numberToString(globals.cpu.numType, globals.cpu.memorySize, globals.base)})<sub>${globals.base}</sub></code>`);

  // Registers
  div = document.createElement("div");
  wrapper.appendChild(div);
  let maxRegOffset = -Infinity, highestRegister = '';
  for (let reg in globals.cpu.registerMap)
    if (globals.cpu.registerMap.hasOwnProperty(reg) && globals.cpu.registerMap[reg].offset > maxRegOffset) {
      highestRegister = reg;
      maxRegOffset = globals.cpu.registerMap[reg].offset;
    }
  let regBytes = globals.cpu.registerMap[highestRegister].offset + numericTypeToObject[globals.cpu.registerMap[highestRegister].type].bytes;
  div.insertAdjacentHTML('beforeend', `<h3>Registers (<small>${Object.keys(globals.cpu.registerMap).length}</small>; ${regBytes} bytes)</h3>`);
  table = document.createElement('table');
  wrapper.appendChild(table);
  table.insertAdjacentHTML(`beforeend`, `<thead><tr><th>Register</th><th>Type</th><th><abbr title='Offset (bytes) into register stack'>Offset</abbr></th><th><abbr title='Width of register in bits'>Size</abbr></th><th><abbr title='Save contents in stack frame upon function call'>Preserve</abbr></th><th>Description</th></tr></thead>`);
  tbody = document.createElement('tbody');
  table.appendChild(tbody);

  for (let register in globals.cpu.registerMap) {
    if (globals.cpu.registerMap.hasOwnProperty(register)) {
      const tr = document.createElement('tr'), meta = globals.cpu.registerMap[register];
      tr.insertAdjacentHTML(`beforeend`, `<th>${register}</th>`);
      tr.insertAdjacentHTML(`beforeend`, `<td>${meta.type}</td>`);
      tr.insertAdjacentHTML(`beforeend`, `<td>${meta.offset}</td>`);
      tr.insertAdjacentHTML(`beforeend`, `<td>${numericTypeToObject[meta.type].bytes * 8}</td>`);
      tr.insertAdjacentHTML(`beforeend`, `<td>${booleanToHTML(meta.preserve)}</td>`);
      tr.insertAdjacentHTML(`beforeend`, `<td><small><em>${meta.desc ?? 'N/A'}</em></small></td>`);
      tbody.appendChild(tr);
    }
  }

  // Options
  div = document.createElement("div");
  wrapper.appendChild(div);
  div.insertAdjacentHTML('beforeend', '<h3>Options</h3>');
  table = document.createElement('table');
  div.appendChild(table);
  tbody = document.createElement('tbody');
  table.appendChild(tbody);

  // Safe NOP
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='HALT program execution on a NOP instruction'>Safe NOP</abbr></th>`);
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
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='Show symbol table in "code" tab'>Show Symbol Table</abbr></th>`);
  td = document.createElement("td");
  tr.appendChild(td);
  const inputSymbolTable = document.createElement("input");
  inputSymbolTable.type = "checkbox";
  inputSymbolTable.checked = globals.tabs.code.symbolTableWrapper.style.display !== "none";
  inputSymbolTable.addEventListener('change', () => {
    if (inputSymbolTable.checked) {
      globals.tabs.code.symbolTableWrapper.style.display = "block";
    } else {
      globals.tabs.code.symbolTableWrapper.style.display = "none";
    }
  });
  td.appendChild(inputSymbolTable);

  // De-Assembler: translate JUMP commands to BRANCH commands w/ labels?
  tr = document.createElement('tr');
  tbody.appendChild(tr);
  tr.insertAdjacentHTML('beforeend', `<th><abbr title='When deassembling machine code, translate JUMP commands into BRANCH commands with labels in the decompiled assembly code?'>Deassembler: labels</abbr></th>`);
  td = document.createElement("td");
  tr.appendChild(td);
  const inputUseLabels = document.createElement("input");
  inputUseLabels.type = "checkbox";
  inputUseLabels.checked = globals.tabs.code.deassembleUseLabels;
  inputUseLabels.addEventListener('change', () => {
    globals.tabs.code.deassembleUseLabels = inputUseLabels.checked;
  });
  td.appendChild(inputUseLabels);

  return wrapper;
}

export function updateBase(base: number) {
  globals.base = base;
  populate();

  globals.memoryView.base = base;
  globals.registerView.base = base;
  updateGUI();
}

function updateCPU(model?: CPUModel, numType?: NumberType, memorySize?: number, registerMap?: string[]) {
  if (model === undefined) model = globals.cpu.model;
  if (numType === undefined) numType = globals.cpu.numType.type;
  if (memorySize === undefined) memorySize = globals.cpu.memorySize;
  __app_init_(model, {
    numType: numType,
    memory: memorySize,
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