import globals from "../globals";
import instructionSet from "../instructionSet";
import { AssemblerType } from "../types/Assembler";
import { IInstructionSetTabProperties, ITabInfo } from "../types/Tabs";
import { hex } from "../utils/general";

export const info: ITabInfo = {
  content: undefined,
  text: 'Instruction Set',
  displayMulti: false,
};

export const properties: IInstructionSetTabProperties = {};

function generateAssemblerInstructionSetHTML(): HTMLDivElement {
  const wrapper = document.createElement('div');

  const table = document.createElement('table');
  wrapper.appendChild(table);
  table.insertAdjacentHTML('beforeend', `<thead><tr><th>Parent Mnemonic</th><th>Mnemonic</th><th>Opcode</th><th title='Is instruction present in the A-level AQA assembly language spec?'>AQA?</th><th>Arguments</th><th>Description</th></tr></thead>`);
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  let lastMnemonic: string; // Last mnemonic that was come accross
  for (const instruction in instructionSet) {
    if (instructionSet.hasOwnProperty(instruction)) {
      const tr = document.createElement("tr"), info = instructionSet[instruction];
      tr.insertAdjacentHTML('beforeend', `<td><b>${lastMnemonic == info.mnemonic ? '' : info.mnemonic}</b></td>`);
      tr.insertAdjacentHTML('beforeend', `<td>${instruction}</td>`);
      if (info.opcode === undefined) {
        tr.insertAdjacentHTML('beforeend', `<td title='Not present in the CPU instruction set'></td>`);
      } else {
        const word = globals.cpu.toHex(info.opcode);
        tr.insertAdjacentHTML('beforeend', `<td><code title='CPU word: 0x${word}'>0x${hex(info.opcode)}</code></td>`);
      }
      tr.insertAdjacentHTML('beforeend', `<td><span style='color:${info.isAQA ? 'green' : 'red'}'>${info.isAQA ? "Yes" : "No"}</span></td>`);

      const args = info.args.length === 0 ? '' : '<code>' + info.args.map(a => `&lt;${AssemblerType[a].toLowerCase()}&gt;`).join(' ') + '</code>';
      tr.insertAdjacentHTML('beforeend', `<td title='${info.args.length} arguments'>${args}</td>`);
      tr.insertAdjacentHTML('beforeend', `<td><small>${info.desc}</small></td>`);
      tbody.appendChild(tr);

      lastMnemonic = info.mnemonic;
    }
  }

  return wrapper;
}

export function init() {
  const content = document.createElement("div");
  info.content = content;

  const title = document.createElement("h2");
  content.appendChild(title);
  title.innerText = "AQA Processor Instruction Set";

  content.insertAdjacentHTML('beforeend', '<p>Link: <a target="_blank" href="https://filestore.aqa.org.uk/resources/computing/AQA-75162-75172-ALI.PDF">Official AQA A-level assembly language specification</a></p>');

  content.appendChild(generateAssemblerInstructionSetHTML());
}