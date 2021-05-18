MOV r1, #05 ' Number of time to loop
MOV r2, #00 ' Counter
MOV r3, #01 ' Add amount
MOV r8, #00 ' Result
inc_loop:
ADD r8, r8, r3 ' Add on to result
ADD r2, r2, #1 ' Increment counter
CMP r2, r1
BLT inc_loop ' If counter < loop times, loop again
HALT