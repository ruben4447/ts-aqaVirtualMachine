import globals from "../globals";
import { ITabProperties } from "../types/Tabs";
import { errorBackground, errorForeground, loadCodeFont, withinState, writeMultilineString } from "../utils/Screen";

interface IRunTabProperties extends ITabProperties {

}

export const properties: IRunTabProperties = {
  target: undefined,
  text: 'Run',
};

function cpuCycle() {
  try {
    globals.cpu.cycle();
  } catch (e) {
    withinState(globals.output, S => {
      S.reset();
      loadCodeFont(S);
      S.setForeground(errorForeground).setBackground(errorBackground).clear();
      writeMultilineString(S, e.message);
    });
  }
}

export function init() {
  const target = document.getElementById('section-run') as HTMLDivElement;
  properties.target = target;

  let btnCycle = document.createElement("button");
  btnCycle.innerText = "Cycle";
  btnCycle.addEventListener('click', () => cpuCycle());
  target.appendChild(btnCycle);
}