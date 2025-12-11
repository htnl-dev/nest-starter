import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AbstractSeeder, SeederResult } from './abstract.seeder';

export const SEEDERS = Symbol('SEEDERS');

export interface SeederRunOptions {
  /** Run specific seeders by name */
  only?: string[];
  /** Skip specific seeders by name */
  skip?: string[];
  /** Force run even in production */
  force?: boolean;
}

export interface SeederRunResult {
  total: number;
  successful: number;
  failed: number;
  results: Record<string, SeederResult>;
}

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);
  private seeders: AbstractSeeder[] = [];

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Register seeders to be run
   */
  registerSeeders(seeders: AbstractSeeder[]): void {
    this.seeders = seeders.sort((a, b) => a.order - b.order);
    this.logger.log(`Registered ${seeders.length} seeders`);
  }

  /**
   * Run all registered seeders
   */
  async run(options: SeederRunOptions = {}): Promise<SeederRunResult> {
    const result: SeederRunResult = {
      total: 0,
      successful: 0,
      failed: 0,
      results: {},
    };

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !options.force) {
      this.logger.warn(
        'Skipping seeders in production. Use force option to override.',
      );
      return result;
    }

    const seedersToRun = this.filterSeeders(options);
    result.total = seedersToRun.length;

    this.logger.log(`Running ${seedersToRun.length} seeders...`);

    for (const seeder of seedersToRun) {
      try {
        this.logger.log(`Running seeder: ${seeder.name}`);
        const seederResult = await seeder.seed();
        result.results[seeder.name] = seederResult;
        result.successful++;
        seeder['logResult'](seederResult);
      } catch (error) {
        result.failed++;
        result.results[seeder.name] = {
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [error instanceof Error ? error.message : String(error)],
        };
        this.logger.error(`Seeder ${seeder.name} failed:`, error);
      }
    }

    this.logger.log(
      `Seeding complete: ${result.successful}/${result.total} successful, ${result.failed} failed`,
    );

    return result;
  }

  /**
   * Run a specific seeder by name
   */
  async runOne(name: string, force = false): Promise<SeederResult> {
    const seeder = this.seeders.find((s) => s.name === name);
    if (!seeder) {
      throw new Error(`Seeder not found: ${name}`);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !force && !seeder.runInProduction) {
      throw new Error(`Seeder ${name} is not allowed in production`);
    }

    this.logger.log(`Running seeder: ${name}`);
    const result = await seeder.seed();
    seeder['logResult'](result);
    return result;
  }

  /**
   * Get list of registered seeders
   */
  getSeeders(): { name: string; order: number; runInProduction: boolean }[] {
    return this.seeders.map((s) => ({
      name: s.name,
      order: s.order,
      runInProduction: s.runInProduction,
    }));
  }

  private filterSeeders(options: SeederRunOptions): AbstractSeeder[] {
    let seeders = [...this.seeders];

    // Filter by shouldRun
    if (!options.force) {
      seeders = seeders.filter((s) => s.shouldRun());
    }

    // Filter by only
    if (options.only?.length) {
      seeders = seeders.filter((s) => options.only!.includes(s.name));
    }

    // Filter by skip
    if (options.skip?.length) {
      seeders = seeders.filter((s) => !options.skip!.includes(s.name));
    }

    return seeders;
  }
}
