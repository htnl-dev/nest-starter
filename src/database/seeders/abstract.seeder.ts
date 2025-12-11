import { Logger } from '@nestjs/common';

export interface SeederResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export abstract class AbstractSeeder {
  protected readonly logger = new Logger(this.constructor.name);

  /** Unique name for this seeder */
  abstract readonly name: string;

  /** Order in which to run (lower = earlier) */
  readonly order: number = 100;

  /** Whether this seeder should run in production */
  readonly runInProduction: boolean = false;

  /**
   * Execute the seeder
   */
  abstract seed(): Promise<SeederResult>;

  /**
   * Check if seeder should run based on environment
   */
  shouldRun(): boolean {
    const isProduction = process.env.NODE_ENV === 'production';
    return !isProduction || this.runInProduction;
  }

  /**
   * Create an empty result
   */
  protected emptyResult(): SeederResult {
    return { created: 0, updated: 0, skipped: 0, errors: [] };
  }

  /**
   * Log the result summary
   */
  protected logResult(result: SeederResult): void {
    this.logger.log(
      `Seeder ${this.name} completed: ` +
        `${result.created} created, ${result.updated} updated, ${result.skipped} skipped` +
        (result.errors.length > 0 ? `, ${result.errors.length} errors` : ''),
    );

    if (result.errors.length > 0) {
      result.errors.forEach((error) => this.logger.error(error));
    }
  }
}
