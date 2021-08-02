main:
  push #5     ; Push 5 as argument
  push #1     ; Push number of arguments
  call square ; Call subroutine 'square'
  hlt

square:
  add sp, #12     ; Adjust to location of argument
  mov acc, *acc   ; Move value at [sp-12] to acc
  mul acc, acc
  ret             ; Pops stack frame