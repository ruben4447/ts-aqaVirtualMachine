## AQA_ARM_EXTENDED
SYNTAX: `SYSCALL <arg>`

The other arguments are in registers `r0`, `r1`, ...

Return value is placed in `r1`

- `1`  - **Exit** arguments [`exit_code`]. Exits process with exit code.
- `3`  - **Read** arguments [`descriptor`, `start`, `length`, `address`]. Read file with descriptor `descriptor`. Read `length` bytes from `start` and place into memory beginning at `address`.
- `4`  - **Write** arguments [`descriptor`, `start`, `length`, `offset`]. Write to file with descriptor `descriptor`. Write `length` bytes from `start` to file at offset `offset`.
- `5`  - **Open** arguments [`fname_start`, `fname_len`, `mode`]. Open file with filename `fname` in mode `mode`, or create file. Return file descriptor number.
- `6`  - **Close** arguments [`descriptor`]. Close file with descriptor `descriptor`.

- `10` - **Write STDOUT**  arguments [`msg_start`, `msg_len`]. Writes message to STDOUT. `msg_start` is address of start of message, `msg_len` is length of message in bytes.
- `11` - **Clear STDOUT**  arguments []. Clears STDOUT.