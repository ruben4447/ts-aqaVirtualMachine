' Execute fibonacci sequence
' r5 -> how many cycles?
' AT END r8 -> result after n cycles

start:
MOV r1, #00 ' a
MOV r2, #01 ' b
MOV r3, #00 ' tmp
MOV r5, #14 ' Total Cycles
MOV r6, #00 ' Current cycle
loop:
MOV r3, r2 ' Move b to tmp
ADD r2, r1, r2 ' b = a + b
MOV r1, r3 ' a = old b
ADD r6, r6, #1 ' Increment current cycle
CMP r6, r5
BLT loop ' current cycle < total cycles
end:
MOV r8, r1 ' ANSWER is 'a'
MOV r1, #0
MOV r2, #0
MOV r3, #0
MOV r4, #0
MOV r5, #0
MOV r6, #0
HALT