MOV R1, #69
MOV R2, #24
loop:
CMP R1, R2
BEQ end
BGT if
else:
SUB R2, R2, R1
B loop
if:
SUB R1, R1, R2
B loop
end:
HALT