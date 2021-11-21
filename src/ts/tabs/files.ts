import { generateControl } from "../classes/BufferView";
import { FileDescriptor } from "../classes/FileDescriptor";
import globals from "../globals";
import { IFilesTabProperties, ITabInfo } from "../types/Tabs";

export const info: ITabInfo = {
  content: undefined,
  text: 'Files',
  displayMulti: false
};

export const properties: IFilesTabProperties = {
  generateBtn: undefined,
  content: undefined,
  update: undefined,
  filelist: undefined,
  bufferView: undefined,
};

function updateBufferView(fd: FileDescriptor) {
  properties.bufferView.innerHTML = '';
  properties.bufferView.style.border = '2px solid black';
  properties.bufferView.style.padding = '3px';
  const dataView = fd.view;
  const DATA = generateControl({
    wrapper: properties.bufferView,
    dataView,
    onupdate(dataView) {
      fd.buff = dataView.buffer;
      fd.view = dataView;
      properties.update();
    }
  });
  DATA.view.updateScreen(S => {
    S.setWidth(window.innerWidth * (2 / 3));
    S.setHeight(window.innerHeight * (1 / 2));
  });
}

function updateFileList(container: HTMLDivElement) {
  container.innerHTML = '';

  let div = document.createElement('div');
  container.insertAdjacentHTML("beforeend", "<h2>Saved Files</h2>");
  container.appendChild(div);
  globals.cpu.files.forEach((fd, name) => {
    let p = document.createElement('p');
    p.innerHTML = `&#x1f5ce; <em>${name}</em> (${fd.buff.byteLength}) &mdash; &nbsp;`;
    let btn = document.createElement("button");
    btn.innerText = 'View';
    btn.addEventListener("click", () => updateBufferView(fd));
    p.appendChild(btn);
    btn = document.createElement("button");
    btn.innerText = 'Open';
    btn.addEventListener("click", () => {
      try {
        let mode = prompt(`Enter file mode`, '3');
        if (mode === null) return;
        let fd = globals.cpu.sys_open(name, +mode);
        // alert(`Piped to file ${name}. File descriptor = ${fd}.`);
      } catch (e) {
        return alert(e);
      }
      properties.bufferView.innerHTML = '';
      properties.update();
    });
    p.appendChild(btn);
    btn = document.createElement("button");
    btn.innerText = 'Delete';
    btn.addEventListener("click", () => {
      if (Array.from(globals.cpu.getFileDescriptors().values()).indexOf(fd) !== -1) return alert(`Unable to delete file as it is currently open. Call sys_close to close pipe.`);
      globals.cpu.files.delete(name);
      properties.bufferView.innerHTML = '';
      properties.update();
    });
    p.appendChild(btn);
    div.appendChild(p);
  });
  let uploadInput = document.createElement('input');
  uploadInput.type = "file";
  uploadInput.addEventListener("input", async () => {
    let file = uploadInput.files[0];
    if (file) {
      let name = prompt(`Enter file name`, file.name);
      if (name === null) return;
      if (globals.cpu.files.has(file.name)) return alert(`File already exists with name '${name}'`);
      let fd = await FileDescriptor.fromFile(file, 3);
      globals.cpu.files.set(name, fd);
      properties.update();
      updateBufferView(fd);
    }
  });

  let btn = document.createElement("button");
  btn.innerText = 'Upload';
  btn.addEventListener('click', () => uploadInput.click());
  div.appendChild(btn);

  div = document.createElement('div');
  container.insertAdjacentHTML("beforeend", "<h2>File Descriptors</h2>");
  container.appendChild(div);
  let table = document.createElement('table'), thead = table.createTHead(), tbody = table.createTBody();
  div.appendChild(table);
  thead.insertAdjacentHTML("beforeend", "<tr><th><abbr title='File Descriptor'>FD</abbr></th><th>Bytes</th><th>Mode</th></tr>");
  globals.cpu.getFileDescriptors().forEach((fd, n) => {
    let tr = document.createElement('tr');
    tr.insertAdjacentHTML("beforeend", `<th><code>${n}</code></th>`);
    tr.insertAdjacentHTML("beforeend", `<th><code>${fd.buff.byteLength}</code></th>`);
    tr.insertAdjacentHTML("beforeend", `<th><code>${fd.mode}</code></th>`);
    let td = document.createElement("td");
    let btn = document.createElement("button");
    btn.innerText = 'View';
    btn.addEventListener("click", () => updateBufferView(fd));
    td.appendChild(btn);
    btn = document.createElement("button");
    btn.innerText = 'Close';
    btn.addEventListener("click", () => {
      try {
        globals.cpu.sys_close(n);
      } catch (e) {
        return alert(e);
      }
      properties.bufferView.innerHTML = '';
      properties.update();
    });
    td.appendChild(btn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
}

properties.update = function () {
  updateFileList(properties.filelist);
};

export function init() {
  const content = document.createElement('div');
  properties.content = content;
  info.content = content;

  let btn = document.createElement("button");
  btn.innerText = 'Update';
  btn.addEventListener("click", properties.update.bind(this));
  content.appendChild(btn);

  let flexContainer = document.createElement("div");
  content.appendChild(flexContainer);
  flexContainer.classList.add('flex-container');

  const filelist = document.createElement("div");
  properties.filelist = filelist;
  filelist.style.margin = '0 15px';
  flexContainer.appendChild(filelist);

  let bufferView = document.createElement("div");
  properties.bufferView = bufferView;
  flexContainer.appendChild(bufferView);

  properties.update();
}