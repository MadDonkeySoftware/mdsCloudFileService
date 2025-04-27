import { ResourceNotFoundError } from '../resource-not-found-error';

describe('ResourceNotFoundError', () => {
  [
    [null, 'resource not found'],
    ['custom message', 'custom message'],
  ].forEach(([message, expectedMessage]) => {
    it(`should have the message "${expectedMessage}"`, () => {
      const error = message
        ? new ResourceNotFoundError(message)
        : new ResourceNotFoundError();
      expect(error.message).toEqual(expectedMessage);
    });
  });
});
