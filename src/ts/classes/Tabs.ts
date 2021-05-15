import { ITabMap } from "../types/Tabs";
import { removeChild } from "../utils/general";

export class Tabs {
  private _wrapper: HTMLDivElement; // Wrapper for tabs
  private _tabContainer: HTMLDivElement;
  private _map: ITabMap;
  private _openTab: string;
  private _multiContentContainer: HTMLDivElement;
  private _multiContent: HTMLDivElement | undefined;

  /**
   * @param target - Where to place all the tabs and the controller
   * @param map - Object of tab information
   * @param multiContent - Content which may be displayed for multiple tabs (dictated by .displayMulti: <boolean>)
   */
  constructor(target: HTMLDivElement, map: ITabMap, multiContent?: HTMLDivElement) {
    this._wrapper = target;
    this._multiContent = multiContent;

    for (let name in map) {
      if (map.hasOwnProperty(name)) {
        if (!(map[name].content instanceof HTMLElement)) throw new TypeError(`Tabs: name '${name}' does not map to an html element -> ${map[name].content}`);
      }
    }
    this._map = map;

    // Container for tabs
    this._tabContainer = document.createElement('div');
    this._tabContainer.classList.add('tab-container');
    this._wrapper.appendChild(this.generateController());
    this._wrapper.appendChild(this._tabContainer);

    // Container for multi-content
    this._multiContentContainer = document.createElement('div');
    this._multiContentContainer.classList.add('tab-multi-content');
    this._wrapper.appendChild(this._multiContentContainer);

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

  public open(name: string) {
    if (!this._map.hasOwnProperty(name)) throw new Error(`#<Tabs>.open: unknown tab reference '${name}'`);
    if (this._openTab) this.close(this._openTab);

    this._openTab = name;
    this._map[this._openTab].btn.dataset.open = "true";
    if (this._map[this._openTab].displayMulti) this._multiContentContainer.appendChild(this._multiContent);
    this._tabContainer.appendChild(this._map[this._openTab].content); // Add tab content to document
  }

  public close(name: string) {
    if (!this._map.hasOwnProperty(name)) throw new Error(`#<Tabs>.open: unknown tab reference '${name}'`);
    if (this._openTab === name) this._openTab = null;
    removeChild(this._multiContentContainer, this._multiContent);// Remove multi-content
    this._map[name].btn.dataset.open = "false";
    removeChild(this._tabContainer, this._map[name].content);// Remove tab content from document
  }

  public toggle(name: string) {
    if (this._openTab === name) {
      this.close(name);
    } else {
      this.open(name);
    }
  }

  public closeAll() {
    removeChild(this._multiContentContainer, this._multiContent);
    for (let name in this._map) {
      if (this._map.hasOwnProperty(name)) {
        removeChild(this._tabContainer, this._map[name].content);
        this._map[name].btn.dataset.open = "false";
      }
    }
  }
}

export default Tabs;