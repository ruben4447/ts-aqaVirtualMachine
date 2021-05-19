import globals from "../globals";
import { AssemblerType, AssemblyLineType, IAssemblyInstructionLine } from "../types/Assembler";
import { ICodeTabProperties, ITabInfo } from "../types/Tabs";
import { downloadTextFile, numberToString, readTextFile } from "../utils/general";
import { errorBackground, errorForeground, loadCodeFont, withinState, writeInCentre, writeMultilineString } from "../utils/Screen";

export const info: ITabInfo = {
  content: undefined,
  text: 'Code',
  displayMulti: true,
};

export const properties: ICodeTabProperties = {
  assemblyCodeInput: undefined,
  partailTranslationWrapper: undefined,
  partialTranslatedInput: undefined,
  labelTable: undefined,
  machineCodeInput: undefined,
  machineCode: undefined,
  insertHalt: true,
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
function generatePartialHTML() {
  const wrapper = document.createElement('div');
  wrapper.classList.add('input-partial-wrapper');
  properties.partailTranslationWrapper = wrapper;

  const title = document.createElement('h2');
  wrapper.appendChild(title);
  title.insertAdjacentHTML('beforeend', 'Partial Translation ');

  const table = document.createElement('table');
  table.classList.add("no-border");
  wrapper.appendChild(table);
  let tr = document.createElement('tr');
  table.appendChild(tr);
  
  // Text input
  let td = document.createElement('td');
  tr.appendChild(td);
  const textarea = document.createElement('textarea');
  td.appendChild(textarea);
  properties.partialTranslatedInput = textarea;
  textarea.readOnly = true;
  textarea.rows = 10;
  textarea.cols = 100;
  
  // Label table
  td = document.createElement('td');
  tr.appendChild(td);
  const labelTable = document.createElement("table");
  td.appendChild(labelTable);
  labelTable.insertAdjacentHTML('beforeend', `<thead><tr><th>Label</th><th>Address</th></tr></thead>`);
  const labelTbody = document.createElement("tbody");
  labelTable.appendChild(labelTbody);

  properties.labelTable = labelTbody;
  
  return wrapper;
}

function updateLabelTable() {
  properties.labelTable.innerHTML = '';
  const labels = globals.assembler.getLabels();
  for (const label of labels) {
    const addr = globals.assembler.getLabel(label);
    properties.labelTable.insertAdjacentHTML('beforeend', `<tr><th>${label}</th><td><code>0x${globals.cpu.toHex(addr)}</code></td></tr>`);
  }
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
  btnDeassemble.disabled = true;
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

      let lines = [`Assembled code (${buffer.byteLength} bytes)`, `... Format: ${globals.cpu.numType.type}`, `... Words: ${buffer.byteLength / globals.cpu.numType.bytes}`, `... Word Size: ${globals.cpu.numType.bytes} bytes`];
      for (let line of lines) {
        S.writeString(line, false);
        S.y += dy;
      }
    });

    properties.machineCode = buffer;
    displayPartialTranslation();
    displayMachineCode();
  }
}

export function decompileAssembly() {
  // TODO decompile assembly
  globalThis.alert(`Not implemented.`);
}

function displayPartialTranslation() {
  updateLabelTable();
  const lines = globals.assembler.getAST();
  let text = '';
  for (const line of lines) {
    if (line.type === AssemblyLineType.Instruction) {
      const info = line as IAssemblyInstructionLine;
      text += `[${info.instruction}] ${info.opcode}`;
      if (info.args.length > 0) {
        text += ` : ${info.args.map(x => `<${AssemblerType[x.type].toLowerCase()}> ${x.num == undefined ? `'${x.value}'` : x.num}`).join(', ')}`;
      }
      text += '\n';
    }
  }
  properties.partialTranslatedInput.value = text;
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

export function loadMachineCodeToMemory(startAddress?: number) {
  if (startAddress === undefined) startAddress = 0;
  console.log(startAddress)
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

  content.appendChild(generateAssemblyHTML());
  content.appendChild(generatePartialHTML());
  content.appendChild(generateBinaryHTML());
}