syscall #11
mov r0, msg
mov r1, len
syscall #10
halt

msg:
  .data "Hello World", 0
len equ ($ - msg) - WORD ; - WORD to remove NUL termination