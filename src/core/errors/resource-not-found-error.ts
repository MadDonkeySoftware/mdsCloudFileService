export class ResourceNotFoundError extends Error {
  constructor(message: string = 'resource not found') {
    super(message);
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
    this.name = 'ResourceNotFoundError';
  }
}
