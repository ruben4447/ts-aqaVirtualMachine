import Popup from "../classes/Popup";
import CustomScreen from "../classes/Screen";
import globals from "../globals";
import instructionSet from "../instructionSet";
import { AssemblerType } from "../types/Assembler";
import { createExecuteRecordObject, IExecuteRecord } from "../types/CPU";
import { ITextMeasurements } from "../types/general";
import { IRunTabProperties, ITabInfo } from "../types/Tabs";
import { createLink, hex } from "../utils/general";
import { errorBackground, errorForeground, loadCodeFont, withinState, writeInCentre, writeMultilineString } from "../utils/Screen";

export const info: ITabInfo = {
  content: undefined,
  text: 'Run',
  displayMulti: true,
};

export const properties: IRunTabProperties = {
  feedbackScreen: undefined,
  feedbackScreenDimensions: [700, 200],
  instructionPointer: undefined,
  optionsPopup: undefined,
  executionHistory: [],
  historyTable: undefined,
};

function generateMainHTML(): HTMLDivElement {
  const wrapper = document.createElement('div');

  let p = document.createElement("p");
  wrapper.appendChild(p);
  p.insertAdjacentHTML('beforeend', 'Instruction Pointer &equals; ');
  const spanIP = document.createElement("code");
  properties.instructionPointer = spanIP;
  spanIP.innerText = "0x" + hex(globals.cpu.readRegister("ip"));
  p.appendChild(spanIP);

  // Prepare for execution
  p = document.createElement("p");
  wrapper.appendChild(p);
  p.insertAdjacentHTML('beforeend', 'Prepare for program execution ');
  const btnPrep = document.createElement('button');
  btnPrep.innerText = 'Initialise';
  btnPrep.addEventListener('click', () => prepareForExecution());
  p.appendChild(btnPrep);

  // Execute code
  p = document.createElement("p");
  wrapper.appendChild(p);
  p.insertAdjacentHTML('beforeend', 'Execute code: &nbsp;');

  const btnSingleCycle = document.createElement('button');
  p.appendChild(btnSingleCycle);
  btnSingleCycle.innerText = 'Single Cycle';
  btnSingleCycle.addEventListener('click', () => runOneCycle(true));

  p.insertAdjacentHTML('beforeend', ' &nbsp;&nbsp; ');
  const btnManyCycle = document.createElement('button');
  p.appendChild(btnManyCycle);
  btnManyCycle.innerText = 'Until execution terminated';
  btnManyCycle.title = 'Run until HALT command, NULL command (if acting like HALT), or error';
  btnManyCycle.addEventListener('click', () => run());

  const Swrapper = document.createElement('div');
  Swrapper.insertAdjacentHTML('afterbegin', '<br><br>');
  const S = new CustomScreen(Swrapper);
  properties.feedbackScreen = S;
  S.setWidth(properties.feedbackScreenDimensions[0]).setHeight(properties.feedbackScreenDimensions[1]);

  wrapper.appendChild(Swrapper);

  return wrapper;
}

function generateHistoryHTML(): HTMLDivElement {
  const wrapper = document.createElement('div');
  let p = document.createElement("p");
  wrapper.appendChild(p);
  p.insertAdjacentHTML('afterbegin', '<b>Execution History</b>&nbsp;&nbsp;');
  const linkHelp = createLink('&#9432;');
  linkHelp.title = `Here is a brief overview of each CPU cycle. Each row represents one CPU cycle.
Clicking on a row will display more detailed information on the screen on the left.
The highlighted row is the row which is being viewed.`;
  p.appendChild(linkHelp);

  const container = document.createElement('div');
  container.classList.add('exec-history-container');
  wrapper.appendChild(container);
  const table = document.createElement('table');
  container.appendChild(table);
  properties.historyTable = table;
  updateExecHistoryTable();

  return wrapper;
}

function updateExecHistoryTable(entryViewing?: number) {
  const table = properties.historyTable;
  table.innerHTML = '';

  // Headers
  table.insertAdjacentHTML('afterbegin', `<thead><tr><th><abbr title="Instruction Pointer">IP</abbr></th><th>Opcode</th><th>Arguments</th><th><abbr title='Did program execution stop after this cycle?'>Terminal?</abbr></th></tr><tr><th colspan="10">CPU Cycles: <code>${properties.executionHistory.length}</code></th></tr></thead>`);

  // Body
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  for (let i = 0; i < properties.executionHistory.length; i++) {
    const record = properties.executionHistory[i], mnemonic = globals.cpu.getMnemonic(record.opcode), viewing = entryViewing === i;
    const tr = document.createElement('tr');
    tr.insertAdjacentHTML('beforeend', `<th>${hex(record.ip)}</th>`);
    tr.insertAdjacentHTML('beforeend', `<td title='${mnemonic}'>${hex(record.opcode)}</td>`);
    tr.insertAdjacentHTML('beforeend', `<td>${record.args.length}</td>`);
    tr.insertAdjacentHTML('beforeend', `<td class='${record.termination}'>${record.termination ? 'Yes' : 'No'}</td>`);
    tbody.appendChild(tr);

    // Viewing functionality
    if (viewing) tr.classList.add('highlight');
    tr.dataset.viewing = viewing.toString();
    tr.addEventListener('click', () => {
      if (viewing) {
        updateExecHistoryTable();
        properties.feedbackScreen.clear();
      } else {
        updateExecHistoryTable(i);
        displayExecInfo(properties.executionHistory[i]);
      }
    });
  }
}

export function prepareForExecution() {
  // Set IP=0
  globals.cpu.writeRegister("ip", 0);

  // Clear feedback screen
  properties.feedbackScreen.clear();
  writeInCentre(properties.feedbackScreen, `- READY FOR PROGRAM EXECUTION - `);

  // Clear history
  properties.executionHistory.length = 0;
  updateExecHistoryTable();

  // Clear main screen
  globals.output.clear();
}

export function runOneCycle(updateVisuals: boolean): IExecuteRecord {
  let obj = createExecuteRecordObject(), cont: boolean;
  try {
    cont = globals.cpu.cycle(obj);
  } catch (e) {
    cont = false;
    withinState(globals.output, S => {
      loadCodeFont(S);
      S.setForeground(errorForeground).setBackground(errorBackground).clear();
      writeMultilineString(S, e.message);
    });
  } finally {
    properties.executionHistory.push(obj);
    if (updateVisuals) {
      displayExecInfo(obj);
      updateExecHistoryTable(properties.executionHistory.length - 1);
    }
    return obj;
  }
}

export function run() {
  let record: IExecuteRecord, cycles = 0;
  globals.tabs.memory.updateMemoryViewOnMemoryWrite = false;
  do {
    record = runOneCycle(false);
    cycles++;
  } while (!record.termination);
  globals.tabs.memory.updateMemoryViewOnMemoryWrite = true;
  globals.memoryView.update();
  displayExecInfo(record);
  updateExecHistoryTable(properties.executionHistory.length - 1);

  withinState(properties.feedbackScreen, S => {
    const text = `[EXECUTION TERMINATED: ${cycles} CPU cycles completed. ]`, dim = S.measureText(text);
    S.x = S.getWidth() / 2 - dim.width / 2;
    S.y = S.getHeight() - dim.height * 1.5;
    S.setForeground('lime')
    S.writeString(text);
  });
}

function displayExecInfo(info: IExecuteRecord) {
  const S = properties.feedbackScreen;
  S.clear();
  loadCodeFont(S);

  const mnemonic = globals.cpu.getMnemonic(info.opcode), commandInfo = instructionSet[mnemonic], argDetails: string[] = [];
  if (commandInfo) {
    for (let i = 0; i < commandInfo.args.length; i++) {
      let detail = '';
      if (commandInfo.args[i] == AssemblerType.Address) detail = "0x" + hex(info.args[i]); // Integer hexadecimal
      else if (commandInfo.args[i] == AssemblerType.Register) detail = globals.cpu.registerMap[info.args[i]]; // Register name
      argDetails.push(detail);
    }
  } else {
    for (let i = 0; i < info.args.length; i++) argDetails.push("");
  }

  const machineCode: string[] = [info.opcode, ...info.args].map(n => "0x" + globals.cpu.toHex(n));
  const machineCodeDimensions: ITextMeasurements[] = machineCode.map(x => S.measureText(x));

  const details: string[] = [mnemonic, ...argDetails];
  const detailDimensions: ITextMeasurements[] = details.map(x => S.measureText(x));

  // MACHINE CODE
  const startX = 10, startY = 10, spacing = 15, charDim = S.measureText('A');
  const titleColour = "yellow", normalColour = "white", extraColour = "lightblue", extraInfoSpace = 12;
  S.x = startX;
  S.setForeground(normalColour);
  for (let i = 0; i < machineCode.length; i++) {
    S.y = startY;

    const maxW = Math.max(machineCodeDimensions[i].width, detailDimensions[i].width);

    S.setForeground(normalColour);
    S.writeString(machineCode[i], false);

    S.y += charDim.height;
    S.setForeground("lightgrey");
    S.writeString(details[i], false);

    S.x += maxW + spacing;
  }

  // TEXT
  if (globals.cpu.executionConfig.commentary) {
    S.y += charDim.height * 1.5;
    S.x = startX;
    S.setForeground("tomato");
    // S.writeString(info.text, false, S.getWidth() - startX * 2);
    writeMultilineString(S, info.text, S.getWidth() - startX * 2);
  }
  S.y += charDim.height;

  // INSTRUCTION POINTER
  S.setForeground(normalColour);
  const spacedX = 150;
  S.y += charDim.height;
  S.x = startX;
  S.setForeground(titleColour);
  S.writeString("INSTRUCTION POINTER:");
  S.x = spacedX;
  S.setForeground(normalColour);
  S.writeString("0x" + hex(info.ip));

  // OPCODE
  S.y += charDim.height;
  S.x = startX;
  S.setForeground(titleColour);
  S.writeString("OPCODE:");
  S.x = spacedX;
  S.setForeground(normalColour);
  S.writeString(`0x${hex(info.opcode)} `);
  if (mnemonic !== undefined) {
    S.x += extraInfoSpace;
    S.setForeground(extraColour);
    S.writeString(`[${commandInfo.mnemonic} : ${mnemonic || '?'}]`);
  }

  // ARGUMENTS
  S.y += charDim.height;
  S.x = startX;
  S.setForeground(titleColour);
  S.writeString("ARGS:");
  if (info.args.length === 0) {
    S.x = spacedX;
    S.writeString('-');
  } else {
    for (let i = 0; i < info.args.length; i++) {
      S.x = spacedX;
      S.setForeground(normalColour);
      let text = `<${AssemblerType[commandInfo.args[i]].toLowerCase()}> 0x${globals.cpu.toHex(info.args[i])} `
      S.writeString(text);

      const detail = details[i + 1]; // '+ 1' as details array also contains detail for the opcode
      if (detail.length !== 0) {
        S.x += extraInfoSpace;
        S.setForeground(extraColour);
        S.writeString(`[${detail}]`);
        S.y += charDim.height;
      }
    }
  }

  // TERMINATE EXECUTION?
  S.y += charDim.height;
  S.x = startX;
  S.setForeground(titleColour);
  S.writeString("TERMINATE EXECUTION:");
  S.setForeground(normalColour);
  S.x = spacedX;
  S.writeString(info.termination.toString().toUpperCase());
  // Halt reason
  let reason: string;
  if (info.error) reason = 'ERROR';
  else if (mnemonic == 'NULL') reason = 'SAFE-NULL';
  else if (mnemonic == 'HALT') reason = 'HALT';
  if (reason) {
    S.x += extraInfoSpace;
    S.setForeground(extraColour);
    S.writeString("[" + reason.toUpperCase() + "]");
  }
}

export function init() {
  const content = document.createElement('div');
  info.content = content;


  const title = document.createElement("h2");
  title.innerText = 'Execute code in memory at instruction pointer  ';
  content.appendChild(title);

  const flexContainer = document.createElement("div");
  content.appendChild(flexContainer);
  flexContainer.classList.add('flex-container');

  let html = generateMainHTML();
  html.classList.add("flex-child");
  flexContainer.appendChild(html);

  html = generateHistoryHTML();
  html.classList.add("flex-child");
  flexContainer.appendChild(html);
}