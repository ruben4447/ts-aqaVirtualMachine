import { downloadBlob, readBinaryFile } from "../utils/general";

const hex = (n: number) => '0x' + n.toString(16);

export enum FileMode {
  Read = 1,
  Write = 2,
}

export interface IFileDescriptor {
  buff: ArrayBuffer;
  read: (start: number, len: number) => ArrayBuffer;
  write: (address: number, data: ArrayBuffer) => void;
  mode: FileMode;
}

export class FileDescriptor implements IFileDescriptor {
  public buff: ArrayBuffer;
  public view: DataView;
  public mode: FileMode;

  /** Either takes size of arraybuffer, or an arraybuffer */
  constructor(data: number | ArrayBuffer, mode: FileMode) {
    this.buff = data instanceof ArrayBuffer ? data : new ArrayBuffer(data);
    this.view = new DataView(this.buff);
    this.mode = mode;
  }

  public read(start: number, len: number) {
    if ((this.mode & FileMode.Read) !== FileMode.Read) throw new Error(`[SIGIO] attempting to read un-readable file (mode = ${hex(this.mode)})`);
    if (start + len > this.buff.byteLength) throw new Error(`[SIGV] Segmentation Fault -> illegal address range ${hex(start)}-${hex(start + len)} in READ operation`);
    return this.buff.slice(start, start + len);
  }

  public write(start: number, data: ArrayBuffer) {
    if ((this.mode & FileMode.Write) !== FileMode.Write) throw new Error(`[SIGIO] attempting to write to un-writable file (mode = ${hex(this.mode)})`);
    if (start + data.byteLength > this.buff.byteLength) {
      let newBuff = new ArrayBuffer(start + data.byteLength);
      const arr = new Uint8Array(newBuff);
      arr.set(new Uint8Array(this.buff), 0);
      arr.set(new Uint8Array(data), start);
      this.buff = newBuff;
      this.view = new DataView(newBuff);
    } else {
      let view = new DataView(data);
      for (let i = 0; i < data.byteLength; ++i) {
        this.view.setUint8(start + i, view.getUint8(i));
      }
    }
  }

  public downloadAs(filename: string, mimeType = 'application/octet-stream') {
    downloadBlob(this.buff, filename, mimeType);
  }

  public static async fromFile(file: File, mode: FileMode) {
    let buff = await readBinaryFile(file);
    return new FileDescriptor(buff, mode);
  }
}