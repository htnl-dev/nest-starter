import { ForbiddenException } from '@nestjs/common';

export class InvalidTransitionException extends ForbiddenException {
  constructor(from: string, to: string) {
    super(`Transition from '${from}' to '${to}' is not allowed`);
  }
}
