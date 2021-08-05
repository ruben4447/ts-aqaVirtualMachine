; Calculate the factorial of a number
; e.g. factorial(5) = 5 * 4 * 3 * 2 * 1
; r1 -> number to calculate factorial of

INP r1 ; Number to find factorial of
MOV r7, r1  ; Set result to initial number

loop:
SUB r1, r1, #1 ; r1--
MUL r7, r7, r1 ; r7 *= r1
CMP r1, #2 ; Compare with #2 as no need to multiply by 1, and avoid multiplying by 0
BGT loop

OUT r7

HALT