export class FlagGenerator {
    private _cnum = 1n; // Current number
    private _fields = new Map<string, bigint>();

    public hasField(field: string) {
        return this._fields.has(field);
    }

    public addField(field: string) {
        this._fields.set(field, this._cnum);
        this._cnum <<= 1n;
    }

    /** Get mask associated with field */
    public getField(field: string) {
        return this._fields.get(field);
    }

    public removeField(field: string) {
        this._fields.delete(field);
        this._clean();
    }

    private _clean() {
        const fields = Array.from(this._fields.keys());
        this._fields.clear();
        this._cnum = 1n;
        fields.forEach(field => this.addField(field));
    }

    public clone() {
        const G = new FlagGenerator();
        this._fields.forEach((_, f) => G.addField(f));
        return G;
    }

    public generate(...fields: string[]) {
        let n = 0n;
        this._fields.forEach((v, f) => fields.includes(f) && (n |= v));
        return new Flag(this, n);
    }
}

export class Flag {
    private _gen: FlagGenerator;
    private _n: bigint;

    constructor(gen: FlagGenerator, n?: bigint) {
        this._gen = gen
        this._n = n ?? 0n;
    }

    public toString(radix?: number) {
        return this._n.toString(radix);
    }

    public valueOf() { return Number(this._n); }

    public isSet(field: string) {
        const mask = this._gen.getField(field);
        return mask === undefined ? false : (this._n & mask) === mask;
    }
    
    public set(field: string) {
        const mask = this._gen.getField(field);
        if (mask === undefined) throw new Error(`Flag#set: unknown flag field '${field}'`);
        this._n |= mask;
        return this;
    }
    
    public unset(field: string) {
        const mask = this._gen.getField(field);
        if (mask === undefined) throw new Error(`Flag#unset: unknown flag field '${field}'`);
        this._n &= ~mask;
        return this;
    }
    
    public toggle(field: string) {
        const mask = this._gen.getField(field);
        if (mask === undefined) throw new Error(`Flag#toggle: unknown flag field '${field}'`);
        this._n ^= mask;
        return this;
    }
}