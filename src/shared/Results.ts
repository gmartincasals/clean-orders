/**
 * Result type para manejo de errores funcional
 * Representa el resultado de una operación que puede tener éxito o fallar
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Crea un Result exitoso con un valor
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Crea un Result fallido con un error
 */
export function fail<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Verifica si un Result es exitoso
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Verifica si un Result ha fallado
 */
export function isFail<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Mapea el valor de un Result exitoso
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Mapea el error de un Result fallido
 */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.ok ? result : fail(fn(result.error));
}

/**
 * Combina dos Results (útil para validaciones múltiples)
 */
export function combine<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }

  return ok(values);
}
