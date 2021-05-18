import { Assembler } from "./classes/Assembler";
import CPU from "./classes/CPU";
import CustomScreen from "./classes/Screen";

import Tabs from "./classes/Tabs";
import * as tabMemory from "./tabs/memory";
import * as tabCode from "./tabs/code";
import * as tabRun from "./tabs/run";
import * as tabInstructionSet from "./tabs/instructionSet";
import * as tabCPU from "./tabs/cpu";
import globals from "./globals";
import instructionSet from "./instructionSet";
import { ICPUConfiguration } from "./types/CPU";
import * as utils from './utils/general';
import { loadCodeFont, withinState, writeInCentre, writeMultilineInCentre } from "./utils/Screen";
globalThis.utils = utils;

/**
 * Initialise web application
 * Set content to globals.main as well as returning it.
 */
export function __app_init_(cpuConfiguration: ICPUConfiguration): HTMLDivElement {
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
  const cpu = new CPU(cpuConfiguration);
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
  console.log(`%cCPU Data Type%c = %c${cpuConfiguration.numType}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(`%cCPU Memory Size%c = %c${cpuConfiguration.memory}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(`%cCPU Registers%c = %c${cpuConfiguration.registerMap}`, 'color:lime;background:black;', '', 'color:yellow;background:black;');
  console.log(logPad);
  withinState(globals.output, S => {
    S.reset();
    loadCodeFont(S);

    S.setForeground('lime');
    writeMultilineInCentre(S, 'AQA Virtual Processor created!\nSee \'CPU\' tab for more'.toUpperCase());
  });

  return main;
}

function __app_main_() {
  __app_init_({
    instructionSet: Assembler.generateCPUInstructionSet(instructionSet),
    numType: 'int16',
    memory: 0xDEAD,
    // registerMap: new Array(20).fill('r').map((v, i) => v + i),
  });

  tabCode.properties.assemblyCodeInput.value = "' Start typing AQA Assembly code here!\nHALT";

  globals.tabs._.open("memory");
}

window.addEventListener('load', () => {
  __app_main_();
});