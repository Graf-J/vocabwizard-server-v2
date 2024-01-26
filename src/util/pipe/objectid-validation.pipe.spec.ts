import { BadRequestException } from '@nestjs/common';
import { ObjectIdValidationPipe } from './objectid-validation.pipe';

describe('ObjectIdValidatoinPipe', () => {
  let objectIdValidationPipe: ObjectIdValidationPipe;

  beforeAll(() => {
    objectIdValidationPipe = new ObjectIdValidationPipe();
  });

  it('should throw exception if id is null', async () => {
    const responsePromise = objectIdValidationPipe.transform(null);

    expect(responsePromise).rejects.toThrow(BadRequestException);
    expect(responsePromise).rejects.toThrow('Invalid ObjectId: null');
  });

  it('should throw exception if id is invalid', async () => {
    const responsePromise = objectIdValidationPipe.transform('invalidId');

    expect(responsePromise).rejects.toThrow(BadRequestException);
    expect(responsePromise).rejects.toThrow('Invalid ObjectId: invalidId');
  });

  it('should return id if id is valid', async () => {
    const id = '507f1f77bcf86cd799439011';

    expect(objectIdValidationPipe.transform(id)).resolves.toBe(id);
  });
});
