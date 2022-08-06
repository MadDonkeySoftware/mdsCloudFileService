export class TerraformLockExistsError extends Error {
  constructor(message: string = 'lock file already exists') {
    super(message);
    Object.setPrototypeOf(this, TerraformLockExistsError.prototype);
  }
}
