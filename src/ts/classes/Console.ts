import { scrollToBottom } from "../utils/general";

export type ConsoleCallback = (value: string, ioconsole: IOConsole) => void;

export class IOConsole {
  private _wrapper: HTMLElement;
  private _: HTMLDivElement;
  private _suspended: boolean = false;
  private _backlog: HTMLDivElement[] = [];
  private _inputCallback: ConsoleCallback;
  private _inputLine: HTMLDivElement;
  private _inputEl: HTMLInputElement;
  private _boundEventHandler: (event: KeyboardEvent) => void;

  constructor(wrapper: HTMLElement) {
    this._wrapper = wrapper;
    this._ = document.createElement('div');
    this._wrapper.appendChild(this._);
    this._.classList.add('ioconsole');
  }

  public isSuspended(): boolean { return this._suspended; }
  public suspend(bool: boolean) {
    if (bool !== this._suspended) {
      this._suspended = bool;
      if (!bool) {
        this._backlog.forEach(line => this._appendLine(line));
        this._backlog.length = 0;
      }
    }
  }

  public createLine(content: string, type: string = null): HTMLDivElement {
    const line = document.createElement('div');
    line.classList.add('ioconsole-line');
    line.dataset.type = type.toString();
    if (type === 'user') line.innerHTML = '&gt;&nbsp;&nbsp;';
    else if (type === 'response') line.innerHTML = '&lt;&nbsp;&nbsp;';
    else if (type === 'error') line.innerHTML = '[!]&nbsp;';
    line.innerText += content;
    return line;
  }

  private _appendLine(line: HTMLDivElement): void {
    this._.insertAdjacentElement('beforeend', line);
    scrollToBottom(this._);
  }

  public print(text: string) {
    const lines = text.toString().split(/\r|\n|\r\n/g);
    for (let i = 0; i < lines.length; i++) {
      const line = this.createLine(lines[i], i === 0 ? "user" : "user-newline");
      if (this._suspended) {
        this._backlog.push(line);
      } else {
        this._appendLine(line);
      }
    }
  }

  public error(message: string) {
    const lines: string[] = message.split(/\r|\n|\r\n/g);
    lines.forEach(line => this._appendLine(this.createLine(line, 'error')));
  }

  public clear(silent = false) {
    this.suspend(false);
    this._.innerHTML = '';
    this._backlog.length = 0;
    if (!silent) this._appendLine(this.createLine("Console was cleared", "notice"));
  }

  public input(prompt: string, callback?: ConsoleCallback): boolean {
    if (this._suspended) {
      this.error("Cannot prompt for user input whilst console is suspended");
      return false;
    }
    if (typeof callback === "function") this._inputCallback = callback;

    const lines = prompt.split(/\r|\n|\r\n/g), last = lines.pop();
    if (lines.length !== 0) this.print(lines.join('\n'));

    const line = this.createLine(last, "user");
    const input = document.createElement("input");
    input.type = 'text';
    this._inputLine = line;
    this._inputEl = input;
    line.insertAdjacentElement('beforeend', input);
    input.focus();
    this._appendLine(line);

    this._boundEventHandler = this._keydownHandler.bind(this);
    this._.addEventListener('keydown', this._boundEventHandler);
  }

  private _keydownHandler(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      let content = this._inputEl.value;
      if (content.length === 0) content = "undefined";
      this._inputEl.remove();
      delete this._inputEl;
      this._inputLine.insertAdjacentText('beforeend', content);
      let line = this.createLine(content, "response");
      this._appendLine(line);
      if (typeof this._inputCallback === 'function') this._inputCallback(content, this);
      this._.removeEventListener('keydown', this._boundEventHandler);
      scrollToBottom(this._);
      this.suspend(false);
    }
  }
}

export default IOConsole;