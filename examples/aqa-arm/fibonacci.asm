; Execute fibonacci sequence
; r5 -> how many cycles?
; AT END r8 -> result after n cycles

start:
MOV r1, #00 ; a
MOV r2, #01 ; b
MOV r5, #13 ; Total Cycles
MOV r6, #00 ; Current cycle
SUB r5, r5, #1
loop:
MOV r3, r2 ; Move b to tmp
ADD r2, r1, r2 ; b = a + b
SUB r1, r2, r1 ; a = b - a
ADD r6, r6, #1 ; Increment current cycle
CMP r6, r5
BLT loop ; current cycle < total cycles
end:
MOV r8, r2 ; ANSWER is ;b;
HALT