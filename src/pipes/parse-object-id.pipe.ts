import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from '@nestjs/common';
import { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

export const MakeObjectId = (
  val: string,
  errorMsg = 'Cast to ObjectId failed.',
): ObjectId => {
  if (!Types.ObjectId.isValid(val)) {
    throw new BadRequestException(errorMsg);
  }

  return new Types.ObjectId(val);
};

export class ParseObjectIdPipe implements PipeTransform<string, ObjectId> {
  // eslint-disable-next-line class-methods-use-this
  transform(value: string, metadata: ArgumentMetadata): ObjectId {
    const { data } = metadata;

    return MakeObjectId(value, `Param validation for field: '${data}' failed.`);
  }
}
