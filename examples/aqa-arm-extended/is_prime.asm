PSH #15 ; ARGUMENT n
PSH #2 ; BYTE LENGTH OF ARGUMENTS
CAL is_prime ; output in r6
OUT r6
HALT

is_prime: ; is_prime(n) -> bool (output in r6)
    ADD r0, fp, #62 ; ADDRESS OF ARGUMENT IN STACK
    LDR r1, *r0 ; VALUE OF ARGUMENT
    CMP r1, #1 ; n == 1
    BEQ retFalse
    CMP r1, #2 ; n == 2
    BEQ retTrue
    MOD r2, r1, #2 ; r2 = n % 2
    CMP r2, #0 ; n % 2 == 0
    BEQ retFalse

    MOV r2, #3 ; i = 3
    MOV r3, r1 ; r3 = n
    SQRT r3 ; r3 = sqrt(n)
    loop:
        CMP r2, r3
        BGT retTrue ; i > sqrt(n) : return true
        MOD r4, r1, r2 ; r4 = n % i
        CMP r4, #0
        BEQ retFalse ; n % i == 0
        ADD r2, r2, #2 ; i += 2
        B loop

    retTrue:
        MOV r6, #1
        RET
    retFalse:
        MOV r6, #0
        RET