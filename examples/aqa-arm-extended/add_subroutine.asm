PSH #5
PSH #7
PSH #4 ; Number of bytes in arguments
CAL add
OUT r6
HALT

add:
ADD r1, fp, #62 ; location of arguments
LDR r2, *r1 ; Load first argument info r2
ADD r1, r1, #2 ; move to location of next argument
LDR r3, *r1 ; Load first argument info r3
ADD r6, r2, r3 ; Sum arguments to r6
RET