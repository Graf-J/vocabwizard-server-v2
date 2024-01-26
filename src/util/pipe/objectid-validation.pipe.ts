import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ObjectIdValidationPipe implements PipeTransform<string> {
  async transform(value: string) {
    if (!value || !isValidObjectId(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }

    return value;
  }
}
