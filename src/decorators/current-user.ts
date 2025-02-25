import { Types } from 'mongoose';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (request.user) {
      request.user._id = new Types.ObjectId(request.user._id);
    }

    return request.user;
  },
);
