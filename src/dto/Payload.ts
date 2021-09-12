export type Payload<T = unknown> = {
    op: number
    d?: T | null
    s?: number | null
    t?: string | null
};