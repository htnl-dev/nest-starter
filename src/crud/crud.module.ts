import { Module, Global } from '@nestjs/common';
import { TransactionManager } from './services/transaction.manager';
import { QueryBuilderService } from './services/query-builder.service';
import { OptimisticLockingService } from './services/optimistic-locking.service';
import { EntityEventEmitter } from './services/entity-event.emitter';

const services = [
  TransactionManager,
  QueryBuilderService,
  OptimisticLockingService,
  EntityEventEmitter,
];

@Global()
@Module({
  providers: services,
  exports: services,
})
export class CrudModule {}
