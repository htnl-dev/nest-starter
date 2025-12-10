import { UpdateAuditableStatusDto } from '../dto/update-auditable-status.dto';
import { GenericAuditableDocument } from '../entities/auditable.entity';
import { ClientSession } from 'mongoose';

export interface Transition<T extends GenericAuditableDocument> {
  from: T['status'];
  to: T['status'];
  description: string;
  effect?: (context: T, session: ClientSession) => Promise<void>;
}

export type TransitionTable<T extends GenericAuditableDocument> = {
  [K in T['status']]?: Omit<Transition<T>, 'from'>[];
};

export interface FsmState<T extends GenericAuditableDocument> {
  status: keyof T['status'];
  step: string;
  iterations: number;
  transitions: Transition<T>[];
}

export interface FsmHandlerResponse<T extends GenericAuditableDocument> {
  statusUpdate: UpdateAuditableStatusDto<T>;
  delay?: number;
}
