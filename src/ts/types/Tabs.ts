import type MemoryView from "../classes/MemoryView";
import type Popup from "../classes/Popup";
import type RegisterView from "../classes/RegisterView";
import type CustomScreen from "../classes/Screen";
import { IExecuteRecord } from "./CPU";

export interface ITabMap {
  [name: string]: ITabInfo;
};

export interface ITabInfo {
  content: HTMLElement;
  text: string;
  displayMulti: boolean;
  btn?: HTMLElement; // "Button" which is generated by the Tab class internally
}

/** Properties for tab:"code" */
export interface ICodeTabProperties {
  assemblyCodeInput: HTMLTextAreaElement;
  partailTranslationWrapper: HTMLDivElement;
  partialTranslatedInput: HTMLTextAreaElement;
  labelTable: HTMLTableSectionElement;
  machineCode: ArrayBuffer;
  machineCodeInput: HTMLTextAreaElement;
  insertHalt: boolean;
}

/** Properties for tab:"memory" */
export interface IMemoryTabProperties {
  memoryView: MemoryView;
  memoryViewDimensions: [number, number];
  registerView: RegisterView;
  registerViewDimensions: [number, number];
  updateMemoryViewOnMemoryWrite: boolean;
}

/** Properties for tab:"run" */
export interface IRunTabProperties {
  feedbackScreen: CustomScreen;
  feedbackScreenDimensions: [number, number],
  instructionPointer: HTMLElement;
  optionsPopup: Popup;
  executionHistory: IExecuteRecord[];
  historyTable: HTMLTableElement;
}

/** Properties for tab:"instruction set" */
export interface IInstructionSetTabProperties { }

/** Properties for tab:"cpu" */
export interface ICPUTabProperties {
  content: HTMLDivElement;
}