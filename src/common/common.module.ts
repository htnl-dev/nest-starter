import { Module, Global } from '@nestjs/common';
import { TransactionManager } from './services/transaction.manager';
import { CacheService } from './services/cache.service';

const services = [TransactionManager, CacheService];

@Global()
@Module({
  providers: services,
  exports: services,
})
export class CommonModule {}
