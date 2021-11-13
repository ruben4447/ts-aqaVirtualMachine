import Popup from "../classes/Popup";
import globals from "../globals";
import { IStackTabProperties, ITabInfo } from "../types/Tabs";
import { numberToString, numericTypeToObject } from "../utils/general";

export const info: ITabInfo = {
    content: undefined,
    text: 'Stack',
    displayMulti: false
};

export const properties: IStackTabProperties = {
    generateBtn: undefined,
    tableStack: undefined,
    tableStackFrames: undefined,
    update: undefined,
    popupStackFrameStructure: undefined,
};

function generateStackFrameStructurePopup() {
    const popup = new Popup('Stack Frame');
    const table = document.createElement("table");
    popup.insertAdjacentElement("beforeend", table);
    table.insertAdjacentHTML("beforeend", `<thead><tr><th>Field</th><th>Data Type</th><th>Bytes</th><th>Description</th></tr></thead>`);
    const tbody = table.createTBody();
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Size</th><td><code>uint32</code></td><td><code>${numericTypeToObject["uint32"].bytes}</code></td><td><small>Size of stack frame</small></td></tr>`);
    const ipType = numericTypeToObject[globals.cpu.registerMap[globals.cpu.regInstructionPtr].type];
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Return Address</th><td><code>${ipType.type}</code></td><td><code>${ipType.bytes}</code></td><td><small>Return address (old IP contents)</small></td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th>[Registers]</th><td colspan='2'><em>Varies</code></td><td><small>Save contents of all registers with preserve=true</small></td></tr>`);
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Arg Bytes</th><td><code>${globals.cpu.numType.type}</code></td><td><code>${globals.cpu.numType.bytes}</code></td><td><small>Bytelength of arguments</small></td></tr>`);
    const uint8 = numericTypeToObject["uint8"];
    tbody.insertAdjacentHTML("beforeend", `<tr><th>Args</th><td><code>${uint8.type}[]</code></td><td><code>${uint8.bytes} &times; &nscr;</code></td><td><small>Sequence of <code>arg bytes</code> bytes in memory which act as subroutine arguments</small></td></tr>`);
    
    popup.insertAdjacentHTML("beforeend", "<h2>Call Method</h2>");
    const code = document.createElement("pre");
    code.style.textAlign = 'left';
    code.innerHTML = `; -- How to call a subroutine`;
    code.innerHTML += `\n; Push arguments`;
    code.innerHTML += `\nPSH #5`;
    code.innerHTML += `\nPSH #7`;
    code.innerHTML += `\n; Push argument bytelength (assuming machine type is int16)`;
    code.innerHTML += `\nPSH #4 ; 2 args * 2 bytes-per-word = 4`;
    code.innerHTML += `\nCAL add ; Call subroutine label`;
    popup.insertAdjacentElement("beforeend", code);

    return popup;
}

/** Populate given table with stack frame info */
export function updateStackFrames(table: HTMLTableElement) {
    table.innerHTML = '';
    let FP = globals.cpu.readRegister(globals.cpu.regFramePtr), memSize = globals.cpu.memorySize;
    let count = 0;

    while (FP <= memSize) {
        let subtable = document.createElement("table");
        let frame = globals.cpu.readFrame(FP);
        if (frame === false) break;
        let thead = subtable.createTHead(), tbody = subtable.createTBody();
        thead.insertAdjacentHTML("beforeend", `<tr><td colspan='10'>Frame <code>#${count}</code> at <code>0x${globals.cpu.toHex(FP)} &mdash; 0x${globals.cpu.toHex(FP + frame.size.value)}</code> occupying <code>${frame.size.value}</code> bytes</td></tr>`);
        thead.insertAdjacentHTML("beforeend", "<tr><th>Field</th><th>Address</th><th>Data Type</th><th>Bytes</th><th>Value</th><th>Description</th></tr>");
        for (let field in frame) {
            if (frame.hasOwnProperty(field)) {
                const tr = document.createElement("tr"), data = frame[field];
                tr.insertAdjacentHTML("beforeend", `<th>${field}</th>`);
                if (data.addr === undefined) tr.insertAdjacentHTML("beforeend", `<td><code>&mdash;</code></td>`);
                else tr.insertAdjacentHTML("beforeend", `<td><code title='${data.addr}'>0x${globals.cpu.toHex(data.addr)}</code></td>`);
                tr.insertAdjacentHTML("beforeend", `<td><code>${data.type.type}</code></td>`);
                if (data.value instanceof ArrayBuffer) {
                    tr.insertAdjacentHTML("beforeend", `<td><code>${data.type.bytes * data.value.byteLength}</code></td>`);
                    let bytes: string[] = [];
                    new Uint8Array(data.value).forEach(n => bytes.push(`<span title='${n}'>${"0x" + n.toString(16).padStart(2, '0')}</span>`));
                    tr.insertAdjacentHTML("beforeend", `<td><code>${bytes.length === 0 ? '&mdash;' : bytes.join(', ')}</code></td>`);
                } else {
                    tr.insertAdjacentHTML("beforeend", `<td><code>${data.type.bytes}</code></td>`);
                    tr.insertAdjacentHTML("beforeend", `<td><code title='${data.value}'>0x${numberToString(data.type, data.value, 16)}</code></td>`);
                }
                tr.insertAdjacentHTML("beforeend", `<td><small>${data.desc}</small></td>`);
                tbody.appendChild(tr);
            }
        }
        FP += frame.size.value;
        table.appendChild(subtable);
        ++count;
    }
    table.insertAdjacentHTML("afterbegin", `<tr><th colspan='10'>Frame Count: ${count}</th></tr>`);
}

export function update() {
    updateStackFrames(properties.tableStackFrames);
}

export function init() {
    const content = document.createElement("div");
    info.content = content;
    properties.update = update;

    content.insertAdjacentHTML("beforeend", "<h1>Stack</h1>");
    let btn = document.createElement("button");
    btn.innerText = 'Generate Snapshot';
    btn.title = 'Generate a snapshot of the stack';
    btn.addEventListener("click", properties.update.bind(this));
    content.appendChild(btn);

    btn = document.createElement("button");
    btn.innerText = 'Stack Frame Structure';
    btn.title = 'View structure of the stack frame data type';
    btn.addEventListener("click", () => {
        properties.popupStackFrameStructure = generateStackFrameStructurePopup();
        properties.popupStackFrameStructure.show();
    });
    content.appendChild(btn);

    const flexContainer = document.createElement("div");
    content.appendChild(flexContainer);
    flexContainer.classList.add('flex-container');

    let wrapper = document.createElement("div");
    wrapper.classList.add("stackframe-view-wrapper", "flex-child");
    flexContainer.appendChild(wrapper);
    wrapper.insertAdjacentHTML("beforeend", "<p><strong>Stack frame</strong>: An abstract data type which is generated on a subroutine call</p>");
    
    properties.tableStackFrames = document.createElement("table");
    wrapper.appendChild(properties.tableStackFrames);
}