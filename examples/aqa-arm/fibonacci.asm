; Execute fibonacci sequence
#define A r1
#define B r2
#define TMP r3
#define CYCLE_COUNT r5
#define CURRENT_CYCLE r6
#define OUT r7

start:
MOV A, #00 ; a
MOV B, #01 ; b
MOV CYCLE_COUNT, #13 ; Total Cycles
MOV CURRENT_CYCLE, #00 ; Current cycle
SUB CYCLE_COUNT, CYCLE_COUNT, #1
loop:
MOV TMP, B ; Move b to tmp
ADD B, A, B ; b = a + b
SUB A, B, A ; a = b - a
ADD CURRENT_CYCLE, CURRENT_CYCLE, #1 ; Increment current cycle
CMP CURRENT_CYCLE, CYCLE_COUNT
BLT loop ; current cycle < total cycles
end:
MOV OUT, B ; ANSWER is B
HALT