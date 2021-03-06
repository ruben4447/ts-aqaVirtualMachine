import { AssemblerError } from "../classes/Assembler";
import Popup from "../classes/Popup";
import globals from "../globals";
import { ICodeTabProperties, ITabInfo } from "../types/Tabs";
import { arrayToBuffer, bufferToArray, downloadTextFile, insertNumericalBaseInput, numberFromString, numberToString, numericTypeToObject, numericTypesAbbrEnum, readTextFile } from "../utils/general";
import { errorBackground, errorForeground, loadCodeFont, withinState, writeMultilineString } from "../utils/Screen";

export const info: ITabInfo = {
  content: undefined,
  text: 'Code',
  displayMulti: true,
};

export const properties: ICodeTabProperties = {
  assemblyCodeInput: undefined,
  symbolTableWrapper: undefined,
  symbolTable: undefined,
  machineCodeInput: undefined,
  machineCode: undefined,
  insertHalt: true,
  deassembleUseLabels: true,
};

function generateAssemblyHTML(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.classList.add('input-assembly-wrapper');

  const title = document.createElement('h2');
  wrapper.appendChild(title);
  title.insertAdjacentHTML('beforeend', 'AQA Assembly Code &nbsp;&nbsp; ');
  let btnAssemble = document.createElement('button');
  btnAssemble.insertAdjacentHTML('beforeend', `<img src='http://bluecedars1.dyndns.org/icons/small/binary.png' />`);
  btnAssemble.innerHTML += ' Assemble Code';
  btnAssemble.addEventListener('click', () => compileAssembly());
  title.appendChild(btnAssemble);

  let p = document.createElement("p");
  wrapper.appendChild(p);

  // Actual file upload
  let inputUpload = document.createElement('input');
  inputUpload.type = 'file';
  inputUpload.accept = '.asm,.txt';
  inputUpload.addEventListener('change', async () => {
    let text = await readTextFile(inputUpload.files[0]);
    textarea.value = text;
    inputUpload.value = ''; // Clear files
  });

  let inputUploadBtn = document.createElement('button');
  inputUploadBtn.insertAdjacentHTML('beforeend', `<img src='http://bluecedars1.dyndns.org/icons/up.png' /> Upload File`);
  inputUploadBtn.addEventListener('click', () => inputUpload.click());
  p.appendChild(inputUploadBtn);
  p.insertAdjacentHTML('beforeend', ` &nbsp; `);

  const btnDownload = document.createElement("button");
  btnDownload.insertAdjacentHTML('beforeend', "<img src='http://bluecedars1.dyndns.org/icons/down.png' /> Download");
  btnDownload.addEventListener('click', () => {
    downloadTextFile(textarea.value, `AssemblyCode-${Date.now()}.asm`);
  });
  p.appendChild(btnDownload);

  p.insertAdjacentHTML('beforeend', ` &nbsp; `);
  const btnClearAssembly = document.createElement('button');
  btnClearAssembly.innerText = 'Clear';
  btnClearAssembly.addEventListener('click', () => textarea.value = '');
  p.appendChild(btnClearAssembly);

  p = document.createElement("p");
  wrapper.appendChild(p);
  p.insertAdjacentHTML('beforeend', 'Insert HALT at end of program ');
  const inputInsertHalt = document.createElement("input");
  inputInsertHalt.type = "checkbox";
  inputInsertHalt.checked = properties.insertHalt;
  inputInsertHalt.addEventListener('change', () => properties.insertHalt = inputInsertHalt.checked);
  p.appendChild(inputInsertHalt);

  const textarea = document.createElement('textarea');
  properties.assemblyCodeInput = textarea;
  textarea.value = "' Start typing AQA Assembly code here!\nHALT";
  textarea.rows = 10;
  textarea.cols = 100;
  wrapper.appendChild(textarea);

  return wrapper;
}

/** Partial translation between assembly and machine code */
function generateSymbolTableHTML() {
  const wrapper = document.createElement('div');
  wrapper.classList.add('input-symboltable-wrapper');
  properties.symbolTableWrapper = wrapper;

  const table = document.createElement('table');
  table.classList.add("no-border");
  wrapper.appendChild(table);
  let tr = document.createElement('tr');
  table.appendChild(tr);

  // Symbol table
  let td = document.createElement('td');
  tr.appendChild(td);
  const symbolTable = document.createElement("table");
  td.appendChild(symbolTable);
  symbolTable.insertAdjacentHTML('beforeend', `<thead><tr><th>Symbol</th><th>Value</th></tr></thead>`);
  const symbolTbody = document.createElement("tbody");
  symbolTable.appendChild(symbolTbody);
  properties.symbolTable = symbolTbody;

  return wrapper;
}

function updateSymbolTable() {
  properties.symbolTable.innerHTML = '';
  globals.assembler.getSymbols().forEach(([symbol, value]) => {
    properties.symbolTable.insertAdjacentHTML('beforeend', `<tr><th><small>${symbol}</small></th><td><code><small>${value}</small></code></td></tr>`);
  })
}

function generateBinaryHTML(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.classList.add('input-assembly-wrapper');

  const title = document.createElement('h2');
  wrapper.appendChild(title);
  title.insertAdjacentHTML('beforeend', 'Machine Code &nbsp;&nbsp; ');
  let btnLoad = document.createElement('button');
  btnLoad.insertAdjacentHTML('beforeend', `<img src='http://bluecedars1.dyndns.org/icons/comp.gray.png' />`);
  btnLoad.innerHTML += ' Load into Memory';
  btnLoad.addEventListener('click', () => {
    loadMachineCodeToMemory(globals.assembler.startAddress);
  });
  title.appendChild(btnLoad);

  let btnDeassemble = document.createElement('button');
  btnDeassemble.insertAdjacentHTML('beforeend', `<img src='http://bluecedars1.dyndns.org/icons/script.png' />`);
  btnDeassemble.innerHTML += ' De-Assemble Code';
  btnDeassemble.addEventListener('click', () => decompileMachineCode());
  title.appendChild(btnDeassemble);

  let btnLoadFromMemory = document.createElement('button');
  btnLoadFromMemory.insertAdjacentHTML('beforeend', `<img src='http://bluecedars1.dyndns.org/icons/diskimg.png' />`);
  btnLoadFromMemory.innerHTML += ' Load from Memory';
  btnLoadFromMemory.title = 'Load bytes from memory';
  btnLoadFromMemory.addEventListener('click', () => {
    let startAddress = 0, words = 1;

    const content = document.createElement("div");
    let p = document.createElement("p");
    content.appendChild(p);
    p.insertAdjacentHTML('beforeend', 'Starting Address: ');
    const inputStartAddress = insertNumericalBaseInput(p, n => startAddress = n);
    inputStartAddress.value = startAddress.toString(16);

    p = document.createElement("p");
    content.appendChild(p);
    p.insertAdjacentHTML('beforeend', 'Word Count: ');
    const inputWordCount = insertNumericalBaseInput(p, n => words = n);
    inputWordCount.value = words.toString(16);

    const button = document.createElement('button');
    button.innerText = "Load Bytes";
    button.addEventListener('click', () => {
      // console.log(`Start at ${startAddress} and extract ${words} words`);
      try {
        const buffer = globals.cpu.readMemoryRegion(startAddress, words);
        const nums = bufferToArray(buffer, globals.cpu.numType);
        properties.machineCode = buffer;
        properties.machineCodeInput.value = nums.map(n => globals.cpu.toHex(n)).join(' ');
        popup.hide();
      } catch (e) {
        let p = document.createElement("p");
        p.innerHTML = `Unable to read ${words} words from memory address 0x${startAddress.toString(16)}:<br>Error: <code>${e.message}</code>`;
        new Popup("Error").setContent(p).show();
      }
    });
    content.appendChild(button);

    const popup = new Popup('Load from Memory').setContent(content);
    popup.show();
  });
  title.appendChild(btnLoadFromMemory);

  const textarea = document.createElement('textarea');
  properties.machineCodeInput = textarea;
  textarea.rows = 10;
  textarea.cols = 100;
  textarea.addEventListener('change', () => {
    // Transform bytes to arraybuffer
    let byteString = textarea.value.replace(/\s+/g, ' ').split(/\s/g);
    let bytes = byteString.filter(x => x.length > 0).map(x => numberFromString(globals.cpu.numType, x, 16));
    let buffer = arrayToBuffer(bytes, globals.cpu.numType);
    properties.machineCode = buffer;
  });
  wrapper.appendChild(textarea);

  return wrapper;
}

/** Compile assembly code */
export function compileAssembly() {
  let code = properties.assemblyCodeInput.value;
  if (properties.insertHalt) code += '\nHALT';

  let buffer: ArrayBuffer, error: Error;
  globals.output.reset();
  try {
    globals.assembler.parse(code);
  } catch (e) {
    console.error(e);
    error = e;
  }

  if (error) {
    properties.machineCode = undefined;
    withinState(globals.output, S => {
      S.reset();
      loadCodeFont(S);
      S.setForeground(errorForeground).setBackground(errorBackground).clear();
      writeMultilineString(S, error.message);
    });
  } else {
    buffer = globals.assembler.getBytes();

    globals.output.reset();
    withinState(globals.output, S => {
      S.setForeground('lime');
      loadCodeFont(S);

      S.x = 15;
      let dy = S.measureText('A').height * 1.5;
      S.y = 10;

      let lines = [`Assembled code (${buffer.byteLength} bytes)`];
      for (let line of lines) {
        S.writeString(line, false);
        S.y += dy;
      }
    });

    properties.machineCode = buffer;
    updateSymbolTable();
    displayMachineCode();
  }
}

export function decompileMachineCode() {
  let buffer = properties.machineCode;
  let error: AssemblerError;
  globals.output.reset();

  try {
    globals.assembler.deAssemble(buffer, properties.deassembleUseLabels);
  } catch (e) {
    console.error(e);
    error = e;
  }

  if (error) {
    properties.machineCode = undefined;
    withinState(globals.output, S => {
      S.reset();
      loadCodeFont(S);
      S.setForeground(errorForeground).setBackground(errorBackground).clear();
      writeMultilineString(S, error.getErrorMessage());
    });
  } else {
    let assembly = globals.assembler.getAssemblyCode();
    properties.assemblyCodeInput.value = `; Decompiled from machine code\n` + assembly;

    globals.output.reset();
    withinState(globals.output, S => {
      S.setForeground('lightblue');
      loadCodeFont(S);

      S.x = 15;
      let dy = S.measureText('A').height * 1.5;
      S.y = 10;

      let lines = [`De-assembled code (${buffer.byteLength} bytes)`, `... Format: ${globals.cpu.numType.type}`, `... Words: ${buffer.byteLength / globals.cpu.numType.bytes}`, `... Word Size: ${globals.cpu.numType.bytes} bytes`];
      for (let line of lines) {
        S.writeString(line, false);
        S.y += dy;
      }
    });
  }
}

function displayMachineCode() {
  // Machine code - array of uint8 bytes
  let machineCode = '';
  const view = new DataView(properties.machineCode), ntype = numericTypeToObject["uint8"];

  for (let i = 0; i < view.byteLength; i++) {
    const number = view[ntype.getMethod](i);
    let text = numberToString(ntype, number, globals.memoryView.base);
    machineCode += text + ' ';
  }
  properties.machineCodeInput.value = machineCode;
}

export function loadMachineCodeToMemory(startAddress?: number) {
  if (startAddress === undefined) startAddress = 0;
  if (properties.machineCode instanceof ArrayBuffer) {
    let endAddress = globals.cpu.loadMemoryBytes(startAddress, properties.machineCode);

    withinState(globals.output, S => {
      S.reset();
      loadCodeFont(S);
      S.setForeground("yellow");
      S.x = 15;
      let dy = S.measureText('A').height * 1.5;
      S.y = 10;

      const base = globals.memoryView.base;
      let lines = [`Loaded ${properties.machineCode.byteLength} bytes into memory`, `... Start address: ${startAddress.toString(base)}`, `... End address: ${endAddress.toString(base)}`, `... Addresses: ${(endAddress - startAddress).toString(base)}`];
      for (let line of lines) {
        S.writeString(line, false);
        S.y += dy;
      }
    });
  }
}

export function init() {
  const content = document.createElement('div');
  info.content = content;

  content.appendChild(generateAssemblyHTML());
  content.appendChild(generateSymbolTableHTML());
  content.appendChild(generateBinaryHTML());
}