; Raise a base to an exponent
; r1 -> base
; r2 -> exponent
; r7 -> result

MOV r1, #02 ; Base
MOV r2, #05 ; Exponent (loop times)
MOV r3, #00 ; Counter
MOV r4, #01 ; Add amount
MOV r7, r1 ; Answer
SUB r2, r2, #01 ; Subtract one from exponent
loop:
MUL r7, r7, r1 ; Multiply result by base
ADD r3, r3, #1 ; Increment counter
CMP r3, r2
BLT loop ; If counter < exponent, loop again
HALT