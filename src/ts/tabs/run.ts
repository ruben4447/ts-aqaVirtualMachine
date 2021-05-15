import Popup from "../classes/Popup";
import CustomScreen from "../classes/Screen";
import globals from "../globals";
import { createExecuteRecordObject, IExecuteRecord } from "../types/CPU";
import { ITextMeasurements } from "../types/general";
import { IRunTabProperties, ITabInfo } from "../types/Tabs";
import { hex } from "../utils/general";
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
  optionsPopup: undefined
};

function generateHTML(): HTMLDivElement {
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

export function prepareForExecution() {
  // Set IP=0
  globals.cpu.writeRegister("ip", 0);

  // Clear feedback screen
  properties.feedbackScreen.clear();
  writeInCentre(properties.feedbackScreen, `- READY FOR PROGRAM EXECUTION -`);

  // Clear main screen
  globals.output.clear();
}

export function runOneCycle(showInfo: boolean): IExecuteRecord {
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
    if (showInfo) displayExecInfo(obj);
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

  withinState(properties.feedbackScreen, S => {
    const text = `[ EXECUTION TERMINATED: ${cycles} CPU cycles completed. ]`, dim = S.measureText(text);
    S.x = S.getWidth() / 2 - dim.width / 2;
    S.y = S.getHeight() - dim.height * 1.5;
    S.setForeground('lime')
    S.writeString(text);
  });
}

function displayExecInfo(info: IExecuteRecord) {
  const S = properties.feedbackScreen;
  if (info.error) console.log(info);
  S.clear();
  loadCodeFont(S);

  const machineCode: string[] = [info.opcode, ...info.args].map(n => "0x" + globals.cpu.toHex(n));
  const machineCodeDimensions: ITextMeasurements[] = machineCode.map(x => S.measureText(x));

  const descriptions: string[] = globals.cpu.executionConfig.detail ? [info.opcodeMnemonic, ...info.argStrs] : null;
  const descriptionsDimensions: ITextMeasurements[] = globals.cpu.executionConfig.detail ? descriptions.map(x => S.measureText(x)) : null;

  // MACHINE CODE
  const startX = 10, startY = 10, spacing = 15, charDim = S.measureText('A');
  const titleColour = "yellow", normalColour = "white", extraColour = "lightblue", extraInfoSpace = 12;;
  S.x = startX;
  S.setForeground(normalColour);
  for (let i = 0; i < machineCode.length; i++) {
    S.y = startY;

    const maxW = globals.cpu.executionConfig.detail ? Math.max(machineCodeDimensions[i].width, descriptionsDimensions[i].width) : machineCodeDimensions[i].width;

    S.setForeground(normalColour);
    S.writeString(machineCode[i], false);

    if (globals.cpu.executionConfig.detail) {
      S.y += charDim.height;
      S.setForeground("lightgrey");
      S.writeString(descriptions[i] || '?', false);
    }

    S.x += maxW + spacing;
  }

  // TEXT
  if (globals.cpu.executionConfig.commentary) {
    S.y += charDim.height * 2;
    S.x = startX;
    S.setForeground("tomato");
    S.writeString(info.text);
  }

  // INSTRUCTION POINTER
  S.setForeground(normalColour);
  const spacedX = 150;
  S.y += charDim.height * 2;
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
  S.writeString(`0x${hex(info.opcode)}`);
  if (globals.cpu.executionConfig.detail) {
    S.x += extraInfoSpace;
    S.setForeground(extraColour);
    S.writeString(`[${info.opcodeMnemonic || '?'}]`);
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
      S.writeString(`0x` + globals.cpu.toHex(info.args[i]));
      if (globals.cpu.executionConfig.detail) {
        S.x += extraInfoSpace;
        S.setForeground(extraColour);
        S.writeString(`[${info.argStrs[i]}]`);
      }
      S.y += charDim.height;
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
  if (globals.cpu.executionConfig.detail) {
    let reason: string;
    if (info.error) reason = 'ERROR';
    else if (info.opcodeMnemonic == 'NULL') reason = 'SAFE-NULL';
    else if (info.opcodeMnemonic == 'HALT') reason = 'HALT';
    if (reason) {
      S.x += extraInfoSpace;
      S.setForeground(extraColour);
      S.writeString("[" + reason.toUpperCase() + "]");
    }
  }
}

function initOptionsPopup() {
  properties.optionsPopup = new Popup('CPU Execution Configuration');

  const body = document.createElement("div");
  properties.optionsPopup.setContent(body);
  let p: HTMLParagraphElement;

  // HALT ON NULL
  p = document.createElement("p");
  body.appendChild(p);
  p.insertAdjacentHTML('beforeend', `<abbr title="Halt programe execution on NULL command (default behaviour is to skip it)">Halt on NULL</abbr>: `);
  const checkboxHaltOnNull = document.createElement("input");
  checkboxHaltOnNull.type = "checkbox";
  checkboxHaltOnNull.checked = globals.cpu.executionConfig.haltOnNull;
  checkboxHaltOnNull.addEventListener('change', () => globals.cpu.executionConfig.haltOnNull = checkboxHaltOnNull.checked);
  p.appendChild(checkboxHaltOnNull);

  // DETAIL
  p = document.createElement("p");
  body.appendChild(p);
  p.insertAdjacentHTML('beforeend', `<abbr title="Show command detail (e.g. opcode mnemonic, argument values)">Details</abbr>: `);
  const checkboxDetails = document.createElement("input");
  checkboxDetails.type = "checkbox";
  checkboxDetails.checked = globals.cpu.executionConfig.detail;
  checkboxDetails.addEventListener('change', () => globals.cpu.executionConfig.detail = checkboxDetails.checked);
  p.appendChild(checkboxDetails);

  // COMMENTARY
  p = document.createElement("p");
  body.appendChild(p);
  p.insertAdjacentHTML('beforeend', `<abbr title="Show text description of what the executed command did">Commentary</abbr>: `);
  const checkboxCommentary = document.createElement("input");
  checkboxCommentary.type = "checkbox";
  checkboxCommentary.checked = globals.cpu.executionConfig.commentary;
  checkboxCommentary.addEventListener('change', () => globals.cpu.executionConfig.commentary = checkboxCommentary.checked);
  p.appendChild(checkboxCommentary);
}

export function init() {
  const content = document.createElement('div');
  info.content = content;

  initOptionsPopup();

  const title = document.createElement("h2");
  title.innerText = 'Execute code in memory at instruction pointer  ';
  const btnOptions = document.createElement("button");
  btnOptions.innerText = 'Config';
  btnOptions.addEventListener('click', () => properties.optionsPopup.show());
  title.appendChild(btnOptions);
  content.appendChild(title);

  const div = generateHTML();
  content.appendChild(div);
}