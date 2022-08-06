export class ResourceExistsError extends Error {
  constructor(message: string = 'resource already exists') {
    super(message);
    Object.setPrototypeOf(this, ResourceExistsError.prototype);
  }
}
