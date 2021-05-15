import globals from "../globals";
import { ICodeTabProperties, ITabInfo } from "../types/Tabs";
import { numberToString } from "../utils/general";
import { errorBackground, errorForeground, loadCodeFont, withinState, writeInCentre, writeMultilineString } from "../utils/Screen";

export const info: ITabInfo = {
  content: undefined,
  text: 'Code',
  displayMulti: true,
};

export const properties: ICodeTabProperties = {
  assemblyCodeInput: undefined,
  machineCodeInput: undefined,
  machineCode: undefined,
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
  const textarea = document.createElement('textarea');
  properties.assemblyCodeInput = textarea;
  textarea.rows = 10;
  textarea.cols = 100;
  wrapper.appendChild(textarea);

  return wrapper;
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
  btnLoad.addEventListener('click', () => loadMachineCodeToMemory());
  title.appendChild(btnLoad);

  let btnDeassemble = document.createElement('button');
  btnDeassemble.insertAdjacentHTML('beforeend', `<img src='http://bluecedars1.dyndns.org/icons/script.png' />`);
  btnDeassemble.innerHTML += ' De-Assemble Code';
  btnDeassemble.disabled = true; // TODO ce-compile assembly
  btnDeassemble.addEventListener('click', () => decompileAssembly());
  title.appendChild(btnDeassemble);


  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  properties.machineCodeInput = textarea;
  textarea.rows = 10;
  textarea.cols = 100;
  wrapper.appendChild(textarea);

  return wrapper;
}

/** Compile assembly code */
export function compileAssembly() {
  const code = properties.assemblyCodeInput.value;

  let buffer: ArrayBuffer, error: Error;
  globals.output.reset();
  try {
    buffer = globals.assembler.parse(code);
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
    globals.output.reset();
    withinState(globals.output, S => {
      S.setForeground('lime');
      loadCodeFont(S);

      S.x = 15;
      let dy = S.measureText('A').height * 1.5;
      S.y = 10;

      let lines = [`Assembled code (${buffer.byteLength} bytes)`, `... Format: ${globals.cpu.numType.type}`, `... Words: ${buffer.byteLength / globals.cpu.numType.bytes}`, `... Word Size: ${globals.cpu.numType.bytes} bytes`];
      for (let line of lines) {
        S.writeString(line, false);
        S.y += dy;
      }
    });

    properties.machineCode = buffer;
    displayMachineCode();
  }
}

export function decompileAssembly() {
  // TODO decompile assembly
  globalThis.alert(`Not implemented.`);
}

function displayMachineCode() {
  // Machine code - array of uint8 bytes
  let machineCode = '';
  const view = new DataView(properties.machineCode);
  const byteCount = view.byteLength, wordCount = byteCount / globals.cpu.numType.bytes;

  for (let i = 0; i < wordCount; i++) {
    const number = view[globals.cpu.numType.getMethod](i * globals.cpu.numType.bytes); // Get {i} word
    let text = numberToString(globals.cpu.numType, number, globals.memoryView.base);
    machineCode += text + ' ';
  }
  properties.machineCodeInput.value = machineCode;
}

export function loadMachineCodeToMemory() {
  if (properties.machineCode instanceof ArrayBuffer) {
    let startAddress = 0;
    let endAddress = globals.cpu.loadMemoryBytes(startAddress, properties.machineCode);

    withinState(globals.output, S => {
      S.reset();
      loadCodeFont(S);
      S.setForeground("yellow");
      S.x = 15;
      let dy = S.measureText('A').height * 1.5;
      S.y = 10;

      const base = globals.memoryView.base;
      let lines = [`Loaded ${properties.machineCode.byteLength} bytes into memory`, `... Format: ${globals.cpu.numType.type} (${globals.cpu.numType.bytes} bytes per word)`, `... Start address: ${startAddress.toString(base)}`, `... End address: ${endAddress.toString(base)}`, `... Addresses: ${(endAddress - startAddress).toString(base)}`];
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

  const assemblyHTML = generateAssemblyHTML();
  content.appendChild(assemblyHTML);

  const binaryHTML = generateBinaryHTML();
  content.appendChild(binaryHTML);
}