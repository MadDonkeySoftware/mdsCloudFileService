import { ResourceExistsError } from '../resource-exists-error';

describe('ResourceExistsError', () => {
  [
    [null, 'resource already exists'],
    ['custom message', 'custom message'],
  ].forEach(([message, expectedMessage]) => {
    it(`should have the message "${expectedMessage}"`, () => {
      const error = message
        ? new ResourceExistsError(message)
        : new ResourceExistsError();
      expect(error.message).toEqual(expectedMessage);
    });
  });
});
