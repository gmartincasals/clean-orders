/**
 * Errores de aplicación con tipos discriminados
 * Permite manejar diferentes tipos de errores de manera type-safe
 */

export type ValidationError = {
  readonly type: 'ValidationError';
  readonly message: string;
  readonly field?: string;
};

export type NotFoundError = {
  readonly type: 'NotFoundError';
  readonly message: string;
  readonly resource: string;
  readonly id: string;
};

export type ConflictError = {
  readonly type: 'ConflictError';
  readonly message: string;
  readonly reason: string;
};

export type InfraError = {
  readonly type: 'InfraError';
  readonly message: string;
  readonly cause?: unknown;
};

/**
 * Tipo unión de todos los errores de aplicación
 */
export type AppError = ValidationError | NotFoundError | ConflictError | InfraError;

// ============ Factory functions ============

export function validationError(message: string, field?: string): ValidationError {
  return {
    type: 'ValidationError',
    message,
    field,
  };
}

export function notFoundError(resource: string, id: string, message?: string): NotFoundError {
  return {
    type: 'NotFoundError',
    message: message ?? `${resource} with id ${id} not found`,
    resource,
    id,
  };
}

export function conflictError(message: string, reason: string): ConflictError {
  return {
    type: 'ConflictError',
    message,
    reason,
  };
}

export function infraError(message: string, cause?: unknown): InfraError {
  return {
    type: 'InfraError',
    message,
    cause,
  };
}

// ============ Type guards ============

export function isValidationError(error: AppError): error is ValidationError {
  return error.type === 'ValidationError';
}

export function isNotFoundError(error: AppError): error is NotFoundError {
  return error.type === 'NotFoundError';
}

export function isConflictError(error: AppError): error is ConflictError {
  return error.type === 'ConflictError';
}

export function isInfraError(error: AppError): error is InfraError {
  return error.type === 'InfraError';
}
