import { Assembler } from "./classes/Assembler";
import CustomScreen from "./classes/Screen";

import Tabs from "./classes/Tabs";
import * as tabMemory from "./tabs/memory";
import * as tabCode from "./tabs/code";
import * as tabRun from "./tabs/run";
import * as tabInstructionSet from "./tabs/instructionSet";
import * as tabCPU from "./tabs/cpu";
import globals from "./globals";
import instructionSet from "./instruction-set/aqa-arm";
import { CPUModel, ICPUConfiguration } from "./types/CPU";
import * as utils from './utils/general';
import { loadCodeFont, withinState, writeInCentre, writeMultilineInCentre } from "./utils/Screen";

import ARMProcessor from "./classes/CPU/AQA-ARM";
import type CPU from "./classes/CPU/CPU";
globalThis.utils = utils;

/**
 * Initialise web application
 * Set content to globals.main as well as returning it.
 */
export function __app_init_(model: CPUModel, cpuConfiguration: ICPUConfiguration): HTMLDivElement {
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
  let cpu: CPU;
  if (model == CPUModel.AQAARMProcessor) cpu = new ARMProcessor(cpuConfiguration);
  else throw new Error(`Unknown CPU model '${model}'`);
  globals.cpu = cpu;

  const assembler = new Assembler(cpu, instructionSet);
  globals.assembler = assembler;

  // SET UP TABS
  tabMemory.init();
  globals.tabs.memory = tabMemory.properties;
  globals.memoryView = tabMemory.properties.memoryView;
  globals.registerView = tabMemory.properties.registerView;

  tabCode.init();
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
  console.clear();
  tabCode.properties.insertHalt = false;
  __app_init_(CPUModel.AQAARMProcessor, {
    instructionSet: Assembler.generateCPUInstructionSet(instructionSet),
    numType: 'int32',
  });
  tabCode.properties.partailTranslationWrapper.style.display = "none";

  tabCode.properties.assemblyCodeInput.value = "' Start typing AQA Assembly code here!\nHALT";
  
  globals.tabs._.open("code");

  tabCode.properties.assemblyCodeInput.value = "MOV r1, #xd2\nINPSTR *r1\nOUTSTR *r1\nHALT";
  tabCode.compileAssembly();
  tabCode.loadMachineCodeToMemory(0);
}

window.addEventListener('load', () => {
  __app_main_();
});

// TODO: