import globals from "../globals";
import { AssemblerType, IInstructionSet } from "../types/Assembler";
import { CPUModel } from "../types/CPU";
import { IInstructionSetTabProperties, ITabInfo } from "../types/Tabs";
import { capitalise, hex, objectGroupBy, sortObjectByKey, sortObjectByKeyAlphabetical, sortObjectKeysAlphabetical } from "../utils/general";

export const info: ITabInfo = {
  content: undefined,
  text: 'Instruction Set',
  displayMulti: false,
};

export const properties: IInstructionSetTabProperties = {
  instructionSetDivWrapper: undefined,
  orderBy: 'opcode',
};

function generateAssemblerInstructionSetHTML(): HTMLDivElement {
  const wrapper = document.createElement('div');
  const isAQAProcessor = globals.cpu.model === CPUModel.AQAARM;

  const table = document.createElement('table');
  wrapper.appendChild(table);
  table.insertAdjacentHTML('beforeend', `<thead><tr><th>Parent Mnemonic</th><th>Mnemonic</th><th>Opcode</th>${isAQAProcessor ? `<th title='Is instruction present in the A-level AQA assembly language spec?'>AQA?</th>` : ``}<th>Arguments</th><th>Description</th></tr></thead>`);
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  if (properties.orderBy === 'opcode') { // Order numerically by OPCODE
    const instructionSet = sortObjectByKey(globals.instructionSet, 'opcode');
    let lastMnemonic: string; // Last mnemonic that was come accross
    for (const instruction in instructionSet) {
      if (instructionSet.hasOwnProperty(instruction)) {
        const info = instructionSet[instruction];
        const tr = _instructionSetHtmlRow(instructionSet, instruction, lastMnemonic === info.mnemonic ? '' : info.mnemonic, isAQAProcessor);
        tbody.appendChild(tr);
        lastMnemonic = info.mnemonic;
      }
    }
  } else if (properties.orderBy === 'mnemonic') { // Order alphabetically by MNEMONIC
    const groups = sortObjectKeysAlphabetical(objectGroupBy(globals.instructionSet, 'mnemonic'));
    for (const parentMnemonic in groups) {
      if (groups.hasOwnProperty(parentMnemonic)) {
        const group = sortObjectByKeyAlphabetical(groups[parentMnemonic], 'mnemonic');
        let i = 0;
        for (const mnemonic in group) {
          const tr = _instructionSetHtmlRow(group, mnemonic, i === 0 ? parentMnemonic : '', isAQAProcessor);
          tbody.appendChild(tr);
          i++;
        }
      }
    }
  } else {
    throw new Error(`InstructionSet: unknown orderBy = '${properties.orderBy}'`);
  }

  return wrapper;
}

function _instructionSetHtmlRow(instructionSet: IInstructionSet, instruction: string, parentMnemonic: string, isAQAProcessor: boolean = false): HTMLTableRowElement {
  const tr = document.createElement("tr"), info = instructionSet[instruction];
  tr.insertAdjacentHTML('beforeend', `<td><b>${parentMnemonic}</b></td>`);
  tr.insertAdjacentHTML('beforeend', `<td>${instruction}</td>`);
  const word = globals.cpu.toHex(info.opcode);
  tr.insertAdjacentHTML('beforeend', `<td><code title='CPU word: 0x${word}'>0x${hex(info.opcode)}</code></td>`);
  if (isAQAProcessor) tr.insertAdjacentHTML('beforeend', `<td><span style='color:${info.isAQA ? 'green' : 'red'}'>${info.isAQA ? "Yes" : "No"}</span></td>`);

  const args = info.args.length === 0 ? '' : '<code>' + info.args.map(a => `&lt;${AssemblerType[a]}&gt;`).join(' ') + '</code>';
  tr.insertAdjacentHTML('beforeend', `<td title='${info.args.length} arguments'>${args}</td>`);
  tr.insertAdjacentHTML('beforeend', `<td><small>${info.desc}</small></td>`);
  return tr;
}

function generateOrderByHTML() {
  const span = document.createElement("span");
  span.insertAdjacentHTML('beforeend', `Order By: `);

  const options = ["opcode", "mnemonic"], iName = `radio-instructionSet-orderBy-${Date.now()}`;
  options.forEach(option => {
    const input = document.createElement("input");
    input.type = "radio";
    input.name = iName;
    input.checked = properties.orderBy === option;
    input.addEventListener('change', () => {
      properties.orderBy = option;
      properties.instructionSetDivWrapper.innerHTML = '';
      properties.instructionSetDivWrapper.appendChild(generateAssemblerInstructionSetHTML());
    });
    span.appendChild(input);
    span.insertAdjacentHTML('beforeend', ` ${capitalise(option)} &nbsp;`);
  });
  return span;
}

export function init() {
  const content = document.createElement("div");
  info.content = content;

  content.insertAdjacentHTML('beforeend', `<h2>Processor Instruction Set</h2>`);
  content.appendChild(generateOrderByHTML());
  content.insertAdjacentHTML('beforeend', `<p><em>Processor: <code>${globals.cpu.model}</code></em></p>`);

  if (globals.cpu.model === CPUModel.AQAARM) content.insertAdjacentHTML('beforeend', '<p>Link: <a target="_blank" href="https://filestore.aqa.org.uk/resources/computing/AQA-75162-75172-ALI.PDF">Official AQA A-level assembly language specification</a></p>');

  properties.instructionSetDivWrapper = document.createElement('div');
  content.appendChild(properties.instructionSetDivWrapper);
  properties.instructionSetDivWrapper.appendChild(generateAssemblerInstructionSetHTML());
}