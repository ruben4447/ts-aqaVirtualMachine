import { Assembler } from "./classes/Assembler";
import { assemblerInstructionMap } from "./assemblerInstructionMap";
import CPU from "./classes/CPU";
import { cpuInstructionSet } from "./cpuInstructionSet";
import CustomScreen from "./classes/Screen";

import Tabs from "./classes/Tabs";
import * as tabMemory from "./tabs/memory";
import * as tabCode from "./tabs/code";
import * as tabRun from "./tabs/run";
import * as tabInstructionSet from "./tabs/instructionSet";
import globals from "./globals";

function init() {
  // SET UP OUTPUT SCREEN
  const outputWrapper = document.createElement("div");
  const output = new CustomScreen(outputWrapper);
  output.setWidth(800).setHeight(300).updateFont(F => {
    F.family = 'consolas';
    F.size = 12;
  });
  globals.output = output;
  outputWrapper.insertAdjacentHTML('beforeend', '<br>');
  const btnClearScreen = document.createElement("button");
  btnClearScreen.innerText = 'Clear Screen';
  btnClearScreen.addEventListener('click', () => output.clear());
  outputWrapper.appendChild(btnClearScreen);

  // SET UP CPU AND ASSEBLER
  const cpu = new CPU(cpuInstructionSet, 0xFFF);
  globals.cpu = cpu;

  const assembler = new Assembler(cpu, assemblerInstructionMap);
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

  const tabManager = new Tabs(
    document.getElementById('tab-wrapper') as HTMLDivElement,
    {
      code: tabCode.info,
      memory: tabMemory.info,
      run: tabRun.info,
      instructionSet: tabInstructionSet.info,
    },
    outputWrapper,
  );
  globals.tabs._ = tabManager;
}

function main() {
  tabCode.compileAssembly();
  tabCode.loadMachineCodeToMemory();
  globals.tabs._.open('instructionSet');

  tabCode.properties.assemblyCodeInput.value = "' Start typing AQA Assembly code here!\nHALT";
  tabCode.properties.assemblyCodeInput.value = "LDR r8, 0 ' Load contents at address 0 into register 8\nHALT";

  tabCode.compileAssembly();
  tabCode.loadMachineCodeToMemory();
}

window.addEventListener('load', () => {
  init();
  main();
});