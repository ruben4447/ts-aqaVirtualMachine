import { Assembler } from "./classes/Assembler";
import CustomScreen from "./classes/Screen";

import Tabs from "./classes/Tabs";
import * as tabMemory from "./tabs/memory";
import * as tabStack from "./tabs/stack";
import * as tabCode from "./tabs/code";
import * as tabRun from "./tabs/run";
import * as tabInstructionSet from "./tabs/instructionSet";
import * as tabCPU from "./tabs/cpu";
import * as tabFiles from "./tabs/files";
import globals from "./globals";
import { CPUModel, ICPUConfiguration } from "./types/CPU";
import * as utils from './utils/general';
import { loadCodeFont, withinState, writeMultilineInCentre } from "./utils/Screen";

import { instructionSet as aqaInstructionSet } from './instruction-set/aqa-arm';
import { instructionSet as aqaInstructionSetExtended } from './instruction-set/aqa-arm-extended';
import { instructionSet as rsInstructionSet } from './instruction-set/rs';

import ARMProcessor from "./classes/CPU/AQA-ARM";
import ARMProcessorExtended from "./classes/CPU/AQA-ARM-Extended";
import type CPU from "./classes/CPU/CPU";
import RSProcessor from "./classes/CPU/RS";
import { IInstructionSet } from "./types/Assembler";
import { FileDescriptor } from "./classes/FileDescriptor";
globalThis.utils = utils;

/**
 * Initialise web application
 * Set content to globals.main as well as returning it.
 */
export function __app_init_(model: CPUModel, cpuConfiguration: ICPUConfiguration): HTMLDivElement {
  const assemblyCode = tabCode.properties.assemblyCodeInput?.value || '';
  const executionConfig = globals.cpu?.executionConfig;
  if (globals.main) globals.main.remove(); // destroy old application

  const main = document.createElement('div');
  main.classList.add('webapp-container');
  main.dataset.name = globals.$name;
  globals.main = main;
  document.body.insertAdjacentElement('afterbegin', main);

  // SET UP OUTPUT SCREEN
  const outputWrapper = document.createElement("div");
  const output = new CustomScreen(outputWrapper);
  output.setWidth(800).setHeight(300);
  globals.output = output;
  outputWrapper.insertAdjacentHTML('beforeend', '<br>');
  const btnClearScreen = document.createElement("button");
  btnClearScreen.innerText = 'Clear Screen';
  btnClearScreen.addEventListener('click', () => output.clear());
  outputWrapper.appendChild(btnClearScreen);

  // SET UP CPU AND ASSEMBLER
  let cpu: CPU, instructionSet: IInstructionSet;
  switch (model) {
    case CPUModel.AQAARM:
      cpu = new ARMProcessor(cpuConfiguration);
      instructionSet = aqaInstructionSet;
      break;
    case CPUModel.AQAARMExt:
      cpu = new ARMProcessorExtended(cpuConfiguration);
      instructionSet = aqaInstructionSetExtended;
      break;
    case CPUModel.RS:
      cpu = new RSProcessor(cpuConfiguration);
      instructionSet = rsInstructionSet;
      break;
    default:
      throw new Error(`Unknown CPU model '${model}'`);
  }
  if (executionConfig) cpu.executionConfig = executionConfig;
  globals.cpu = cpu;
  globals.instructionSet = instructionSet;
  const assembler = new Assembler(cpu, instructionSet);
  globals.assembler = assembler;

  // SET UP TABS
  tabMemory.init();
  globals.tabs.memory = tabMemory.properties;
  globals.memoryView = tabMemory.properties.memoryView;
  globals.registerView = tabMemory.properties.registerView;

  tabStack.init();
  globals.tabs.stack = tabStack.properties;

  tabFiles.init();
  globals.tabs.files = tabFiles.properties;

  tabCode.init();
  tabCode.properties.assemblyCodeInput.value = assemblyCode;
  globals.tabs.code = tabCode.properties;

  tabRun.init();
  globals.tabs.run = tabRun.properties;

  tabInstructionSet.init();
  globals.tabs.instructionSet = tabInstructionSet.properties;

  tabCPU.init();
  globals.tabs.cpu = tabCPU.properties;

  const tabManager = new Tabs(
    main,
    {
      code: tabCode.info,
      memory: tabMemory.info,
      stack: tabStack.info,
      run: tabRun.info,
      instructionSet: tabInstructionSet.info,
      cpu: tabCPU.info,
      files: tabFiles.info
    },
    outputWrapper,
  );
  globals.tabs._ = tabManager;

  // Message to user
  withinState(globals.output, S => {
    S.reset();
    loadCodeFont(S);
    S.setForeground('lime');
    writeMultilineInCentre(S, `-- Virtual Processor Created --\nModel: ${cpu.model}\n${cpu.numType.type}; memory 0x${cpu.memorySize.toString(16)}\nSee \'CPU\' tab for more`.toUpperCase());
  });

  return main;
}

function __app_main_() {
  // Initiate application
  __app_init_(CPUModel.AQAARMExt, {
    numType: 'int16'
  });

  tabCode.properties.insertHalt = false;

  // Prompt user
  tabCode.properties.assemblyCodeInput.value = "; Start typing assembly code here!\n";

  globals.tabs._.open("code");

  tabCode.properties.assemblyCodeInput.value = `
mov r0, fname
mov r1, fname_len
mov r2, #3 ; Read & Write
syscall #5 ; Create file with fname. Store descriptor in r1

mov r0, r1
mov r1, data
mov r2, data_len
syscall #4 ; Write
syscall #6 ; Close
halt

fname:
  .data "my-file.txt"
fname_len equ $ - fname
data:
  .bytes "Hello World"
data_len equ $ - data
  `.trim();
  tabCode.compileAssembly();
  tabCode.loadMachineCodeToMemory(0);
  tabRun.run();

  let uint8array = new Uint8Array("Hello, world".split('').map(c => c.charCodeAt(0)));
  let fd = new FileDescriptor(uint8array.buffer, 3);
  globals.cpu.files.set('hello.txt', fd);

  globals.tabs._.open("files");
  globals.tabs.files.update();
}

window.addEventListener('load', () => {
  __app_main_();
});