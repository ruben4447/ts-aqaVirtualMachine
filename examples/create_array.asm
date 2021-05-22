MOV r1, #xd2 ; Current array address
MOV r2, #00 ; Current array value
MOV r3, #01 ; Array step value
MOV r4, #10 ; Array end value

loop:
ADD r2, r2, r3 ; Increase array value by step
MOV *r1, r2 ; Move r2 to the address in r1
ADD r1, r1, #1 ; Increment address
CMP r2, r4
BGT end
BEQ end
B loop

end:
HALT