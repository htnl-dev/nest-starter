import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { SeederService } from './seeder.service';

async function bootstrap() {
  const logger = new Logger('Seeder');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const seederService = app.get(SeederService);

    // Parse command line arguments
    const args = process.argv.slice(2);
    const force = args.includes('--force') || args.includes('-f');
    const listOnly = args.includes('--list') || args.includes('-l');

    // Get specific seeder to run
    const onlyIndex = args.findIndex((a) => a === '--only' || a === '-o');
    const only = onlyIndex >= 0 ? args[onlyIndex + 1]?.split(',') : undefined;

    // Get seeders to skip
    const skipIndex = args.findIndex((a) => a === '--skip' || a === '-s');
    const skip = skipIndex >= 0 ? args[skipIndex + 1]?.split(',') : undefined;

    if (listOnly) {
      const seeders = seederService.getSeeders();
      logger.log('Available seeders:');
      seeders.forEach((s) => {
        logger.log(`  - ${s.name} (order: ${s.order}, production: ${s.runInProduction})`);
      });
      await app.close();
      return;
    }

    logger.log('Starting database seeding...');

    const result = await seederService.run({ only, skip, force });

    if (result.failed > 0) {
      logger.error(`Seeding completed with ${result.failed} failures`);
      process.exit(1);
    }

    logger.log('Seeding completed successfully');
    await app.close();
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
}

bootstrap();
