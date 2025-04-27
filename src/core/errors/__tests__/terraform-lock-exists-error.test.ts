import { TerraformLockExistsError } from '../terraform-lock-exists-error';

describe('TerraformLockExistsError', () => {
  [
    [undefined, 'lock file already exists'],
    ['custom message', 'custom message'],
  ].forEach(([message, expectedMessage]) => {
    it(`should have the message "${expectedMessage}"`, () => {
      const error = message
        ? new TerraformLockExistsError(message)
        : new TerraformLockExistsError();
      expect(error.message).toEqual(expectedMessage);
    });
  });
});
