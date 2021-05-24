import { CPUModel, ICPUConfiguration, IExecuteRecord } from "../../types/CPU";
import { NumberType } from "../../types/general";
import CPU from "./CPU";
import { instructionSet } from '../../instruction-set/rs';

export class RSProcessor extends CPU {
    public static readonly defaultRegisters: string[] = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12"];
    public static readonly defaultNumType: NumberType = 'float32';
    public static readonly requiredRegisters: string[] = ["ip", "cmp"];
    public readonly model: CPUModel = CPUModel.RS;

    public constructor(config: ICPUConfiguration) {
        super(instructionSet, config, RSProcessor.defaultRegisters, RSProcessor.defaultNumType, RSProcessor.requiredRegisters);
    }

    /** @override */
    public execute(opcode: number, info: IExecuteRecord): boolean {
        let continueExec = true;

        switch (opcode) {
            case this.instructionSet.NOP:
                // NOP
                if (this.executionConfig.commentary) info.text = this.executionConfig.haltOnNull ? 'NOP: halted programme execution' : 'Skip NOP instruction';
                continueExec = !this.executionConfig.haltOnNull;
                break;
            default: 
                info.termination = true;
                throw new Error(`execute: unknown opcode 0x${opcode.toString(16)}`);
        }
        info.termination = !continueExec;
        return continueExec;
    }
}

export default RSProcessor;