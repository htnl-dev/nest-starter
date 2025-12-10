import { ForbiddenException } from '@nestjs/common';

export class InvalidTransitionException extends ForbiddenException {
  constructor(currentStatus: string, nextStatus: string) {
    super(
      `Invalid transition`,
      `Transition from ${currentStatus} to ${nextStatus} is not allowed`,
    );
  }
}

export class FinalStateTransitionException extends ForbiddenException {
  constructor(currentStatus: string, nextStatus: string) {
    super(
      `Item is already in a final state: ${currentStatus}`,
      `Transition from ${currentStatus} to ${nextStatus} is not allowed`,
    );
  }
}
