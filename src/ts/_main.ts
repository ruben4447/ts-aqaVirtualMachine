import { Assembler } from "./classes/Assembler";
import CustomScreen from "./classes/Screen";

import Tabs from "./classes/Tabs";
import * as tabMemory from "./tabs/memory";
import * as tabCode from "./tabs/code";
import * as tabRun from "./tabs/run";
import * as tabInstructionSet from "./tabs/instructionSet";
import * as tabCPU from "./tabs/cpu";
import globals from "./globals";
import { CPUModel, ICPUConfiguration } from "./types/CPU";
import * as utils from './utils/general';
import { loadCodeFont, withinState, writeInCentre, writeMultilineInCentre } from "./utils/Screen";

import { instructionSet as aqaInstructionSet } from './instruction-set/aqa-arm';
import { instructionSet as aqaInstructionSetExtended } from './instruction-set/aqa-arm-extended';
import { instructionSet as rsInstructionSet } from './instruction-set/rs';

import ARMProcessor from "./classes/CPU/AQA-ARM";
import ARMProcessorExtended from "./classes/CPU/AQA-ARM-Extended";
import type CPU from "./classes/CPU/CPU";
import RSProcessor from "./classes/CPU/RS";
import { IInstructionSet } from "./types/Assembler";
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
  assembler.replaceCommandMap = globals.asmReplaceCommandsMap;
  globals.assembler = assembler;

  // SET UP TABS
  tabMemory.init();
  globals.tabs.memory = tabMemory.properties;
  globals.memoryView = tabMemory.properties.memoryView;
  globals.registerView = tabMemory.properties.registerView;

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
      run: tabRun.info,
      instructionSet: tabInstructionSet.info,
      cpu: tabCPU.info,
    },
    outputWrapper,
  );
  globals.tabs._ = tabManager;

  // Message to user
  const logPad = '-'.repeat(20);
  console.log(logPad);
  console.log(`%cInitiating Application...`, 'color:lime;background:black;');
  console.log(`%cCPU Model%c = %c${cpu.model}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(`%cCPU Data Type%c = %c${cpuConfiguration.numType}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(`%cCPU Memory Size%c = %c${cpuConfiguration.memory}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(`%cCPU Registers%c = %c${cpuConfiguration.registerMap}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(logPad);
  withinState(globals.output, S => {
    S.reset();
    loadCodeFont(S);
    S.setForeground('lime');
    writeMultilineInCentre(S, `-- Virtual Processor created --\nModel: '${cpu.model}'\nNum Type ${cpu.numType.type}; memory capacity 0x${cpu.memorySize.toString(16)}\nSee \'CPU\' tab for more`.toUpperCase());
  });

  return main;
}

function __app_main_() {
  tabCode.properties.insertHalt = false;
  // tabCode.properties.partailTranslationWrapper.style.display = "none";

  // Set up pre-assembly command replation object
  [
    ['B', 'JMP', 'Jump to [label]'],
    ['BEQ', 'JEQ', 'Jump to [label] if CMP is \'equal to\''],
    ['BNE', 'JNE', 'Jump to [label] if CMP is not \'equal to\''],
    ['BLT', 'JLT', 'Jump to [label] if CMP is \'less than\''],
    ['BGT', 'JGT', 'Jump to [label] if CMP is \'greater to\''],
  ].forEach(([cmd, replaceWith, description]) => globals.asmReplaceCommandsMap[cmd] = { replaceWith, description });

  // Initiate application
  __app_init_(CPUModel.RS, {
    numType: 'int16',
  });

  // Prompt user
  tabCode.properties.assemblyCodeInput.value = "; Start typing assembly code here!\nHALT";

  globals.tabs._.open("code");

  tabCode.properties.assemblyCodeInput.value = `
main:
  psh #5     ; Push 5 as argument
  psh #1     ; Push number of arguments
  cal square
  hlt

square:
  add sp, #12     ; Adjust to location of argument
  mov acc, *acc
  mul acc, acc
  ret
  `.trim();
  tabCode.compileAssembly();
  tabCode.loadMachineCodeToMemory(0);
}

window.addEventListener('load', () => {
  __app_main_();
});

// TODO: