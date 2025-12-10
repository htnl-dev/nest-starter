import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUser } from '../types/logto.types';
import type { RequestWithAuth } from '../types/logto.types';

export const GetCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.user;
  },
);
