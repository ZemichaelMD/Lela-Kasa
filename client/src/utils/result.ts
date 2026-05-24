/**
 * A simple Result/Either type for explicit error handling without exceptions.
 * Use in service methods that can fail in expected ways.
 */

export type Ok<T> = { success: true; data: T };
export type Err<E = string> = { success: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

export function err<E = string>(error: E): Err<E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.success === false;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) return result.data;
  throw new Error(`Unwrap called on Err: ${String(result.error)}`);
}

export function mapOk<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (isOk(result)) return ok(fn(result.data));
  return result;
}

export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) return err(fn(result.error));
  return result as Ok<T>;
}
