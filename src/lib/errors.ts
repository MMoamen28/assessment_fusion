export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") { super(401, "UNAUTHORIZED", message); }
}
export class ForbiddenError extends AppError {
  constructor(message = "You are not allowed to do this") { super(403, "FORBIDDEN", message); }
}
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") { super(404, "NOT_FOUND", message); }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(409, "CONFLICT", message); }
}
export class InvalidTransitionError extends AppError {
  constructor(message: string) { super(422, "INVALID_TRANSITION", message); }
}
export class ValidationError extends AppError {
  constructor(details: unknown, message = "Invalid input") { super(400, "VALIDATION_ERROR", message, details); }
}
