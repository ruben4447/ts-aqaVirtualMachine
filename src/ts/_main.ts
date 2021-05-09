import { Assembler } from "./classes/Assembler";
import { assemblerInstructionMap } from "./AssemblerInstructionMap";
import CPU from "./classes/CPU";
import { cpuInstructionSet } from "./cpuInstructionSet";
import CustomScreen from "./classes/Screen";

import Tabs from "./classes/Tabs";
import * as tabMemory from "./tabs/memory";
import * as tabCode from "./tabs/code";
import * as tabRun from "./tabs/run";
import globals from "./globals";

// SET UP OUTPUT SCREEN
const output = new CustomScreen(document.getElementById('screen-wrapper') as HTMLDivElement);
output.setWidth(800).setHeight(300).updateFont(F => {
  F.family = 'consolas';
  F.size = 12;
});
globals.output = output;
const btnClearScreen = document.getElementById('btn-clear-screen') as HTMLButtonElement;
btnClearScreen.addEventListener('click', () => output.clear());

// SET UP CPU AND ASSEBLER
const cpu = new CPU(cpuInstructionSet);
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
tabCode.properties.assemblyCodeInput.value = "' Start typing AQA Assembly code here!\nHALT";
tabCode.properties.assemblyCodeInput.value = "LDR r8, 0\nHALT";

tabRun.init();
globals.tabs.run = tabRun.properties;

const tabManager = new Tabs(document.getElementById('tab-controls') as HTMLDivElement, {
  code: { content: document.getElementById('section-code'), text: 'Code', displayMulti: true, },
  memory: { content: tabMemory.properties.target, text: tabMemory.properties.text, displayMulti: false, },
  run: { content: tabRun.properties.target, text: tabRun.properties.text, displayMulti: true, },
});
tabManager.setMultiContent(document.getElementById('tab-multi') as HTMLDivElement);
tabManager.open("memory");
globals.tabs._ = tabManager;

// CALLBACKS
cpu.onMemoryWrite((startAddress, endAddress, cpu) => {
  if (startAddress === endAddress) {
    globals.memoryView.update(startAddress);
  } else {
    globals.memoryView.update();
  }
});
cpu.onRegisterWrite((index, value, cpu) => {
  globals.registerView.update(index);
  globals.memoryView.update();
});

// END OF SETUP - test code:
tabCode.compileAssembly();
tabCode.loadMachineCodeToMemory();