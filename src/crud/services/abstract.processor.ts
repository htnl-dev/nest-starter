import { WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export abstract class AbstractProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  protected readonly logger = new Logger(this.constructor.name);

  async onApplicationShutdown(signal?: string) {
    this.logger.log(
      `${this.constructor.name} shutting down on signal: ${signal}`,
    );
    const worker = this.worker;
    if (worker) {
      this.logger.log(`Closing ${this.constructor.name} worker`);
      await worker.close();
      this.logger.log(`${this.constructor.name} worker closed`);
    }

    this.logger.log(`${this.constructor.name} shutdown complete`);
  }
}
