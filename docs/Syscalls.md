## AQA_ARM_EXTENDED
SYNTAX: `SYSCALL <arg>`

The other arguments are in registers `r0`, `r1`, ...

- `1`  - **Exit** arguments [`exit_code`]. Exits process with exit code.
- `10` - **Write STDOUT**  arguments [`msg_start`, `msg_len`]. Writes message to STDOUT. `msg_start` is address of start of message, `msg_len` is length of message in bytes.
- `11` - **Clear STDOUT**  arguments []. Clears STDOUT.