import { ITabMap } from "../types/Tabs";

export class Tabs {
  private _target: HTMLDivElement; // Wrapper for tab controls
  private _map: ITabMap;
  private _openTab: string;
  private _multiContent: HTMLDivElement;

  constructor(target: HTMLDivElement, map: ITabMap) {
    this._target = target;
    for (let name in map) {
      if (map.hasOwnProperty(name)) {
        if (!(map[name].content instanceof HTMLElement)) throw new TypeError(`Tabs: name '${name}' does not map to an html element -> ${map[name].content}`);
      }
    }
    this._map = map;

    this._target.appendChild(this.generateController());

    this.closeAll();
  }

  public generateController(): HTMLDivElement {
    const div = document.createElement("div");
    div.classList.add('tab-controller');

    for (let name in this._map) {
      if (this._map.hasOwnProperty(name)) {
        const info = this._map[name], btn = document.createElement("span");
        this._map[name].content.classList.add('tab-content');
        this._map[name].content.dataset.tabName = name;
        btn.classList.add('tab-control-btn');
        btn.dataset.tab = name;
        btn.dataset.open = "false";
        btn.innerText = info.text;
        div.appendChild(btn);
        btn.addEventListener('click', () => this.toggle(name));
        this._map[name].btn = btn;
      }
    }

    return div;
  }

  /** Multi Content is content which may be displayed for multiple tabs. Whether it is displayed or not is dependant upon tab settings (property .displayMulti) */
  public setMultiContent(el: HTMLDivElement) {
    this._multiContent = el;
    if (!this._openTab || (this._openTab && !this._map[this._openTab].displayMulti)) el.style.display = "none";
  }

  public open(name: string) {
    if (this._openTab) this.close(this._openTab);

    this._openTab = name;
    this._map[this._openTab].btn.dataset.open = "true";
    this._map[this._openTab].content.style.display = 'block';
    if (this._map[this._openTab].displayMulti) this._multiContent.style.display = 'block';
  }

  public close(name: string) {
    if (this._openTab === name) this._openTab = null;
    this._multiContent.style.display = 'none';
    this._map[name].btn.dataset.open = "false";
    this._map[name].content.style.display = 'none';
  }

  public toggle(name: string) {
    if (this._openTab === name) {
      this.close(name);
    } else {
      this.open(name);
    }
  }

  public closeAll() {
    for (let name in this._map) {
      if (this._map.hasOwnProperty(name)) {
        this._map[name].content.style.display = 'none';
        this._map[name].btn.dataset.open = "false";
      }
    }
  }
}

export default Tabs;