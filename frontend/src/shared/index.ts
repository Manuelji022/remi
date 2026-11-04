export type ReadResult<T> =
  { ok: true; value: T } | { ok: false; error: string }
