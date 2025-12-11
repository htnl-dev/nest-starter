import { Module, Global } from '@nestjs/common';
import { TransactionManager } from './services/transaction.manager';
import { QueryBuilderService } from './services/query-builder.service';
import { OptimisticLockingService } from './services/optimistic-locking.service';
import { EntityEventEmitter } from './services/entity-event.emitter';
import { CacheService } from './services/cache.service';

const services = [
  TransactionManager,
  QueryBuilderService,
  OptimisticLockingService,
  EntityEventEmitter,
  CacheService,
];

@Global()
@Module({
  providers: services,
  exports: services,
})
export class CrudModule {}
