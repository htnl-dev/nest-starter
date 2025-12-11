import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractSeeder, SeederResult } from './abstract.seeder';
import { User, UserDocument } from '../../user/entities/user.entity';
import { LogtoUsersService } from '../../logto/services/users.service';

@Injectable()
export class UserSeeder extends AbstractSeeder {
  readonly name = 'UserSeeder';
  readonly order = 10;
  readonly runInProduction = true;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly logtoUsersService: LogtoUsersService,
  ) {
    super();
  }

  async seed(): Promise<SeederResult> {
    const result = this.emptyResult();

    try {
      // Fetch all users from Logto with pagination
      let page = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const logtoResponse = await this.logtoUsersService.findAll({
          page,
          page_size: pageSize,
        });

        const logtoUsers = logtoResponse.data;

        if (logtoUsers.length === 0) {
          hasMore = false;
          continue;
        }

        for (const logtoUser of logtoUsers) {
          try {
            await this.syncUser(logtoUser, result);
          } catch (error) {
            result.errors.push(
              `Failed to sync user ${logtoUser.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        // Check if we've fetched all users
        hasMore = logtoUsers.length === pageSize;
        page++;
      }
    } catch (error) {
      result.errors.push(
        `Failed to fetch users from Logto: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  }

  private async syncUser(
    logtoUser: {
      id: string;
      primaryEmail?: string;
      name?: string;
      profile?: { givenName?: string; familyName?: string };
    },
    result: SeederResult,
  ): Promise<void> {
    const email = logtoUser.primaryEmail;
    if (!email) {
      result.skipped++;
      this.logger.debug(`Skipping user ${logtoUser.id}: no email`);
      return;
    }

    const existingUser = await this.userModel.findById(logtoUser.id);

    const userData = {
      firstName: logtoUser.profile?.givenName || logtoUser.name || '',
      lastName: logtoUser.profile?.familyName || '',
      email,
      logtoId: logtoUser.id,
    };

    if (existingUser) {
      // Update existing user
      const hasChanges =
        existingUser.firstName !== userData.firstName ||
        existingUser.lastName !== userData.lastName ||
        existingUser.email !== userData.email;

      if (hasChanges) {
        await this.userModel.updateOne(
          { _id: logtoUser.id },
          { $set: userData },
        );
        result.updated++;
        this.logger.debug(`Updated user: ${email}`);
      } else {
        result.skipped++;
      }
    } else {
      // Create new user
      await this.userModel.create({
        _id: logtoUser.id,
        ...userData,
        isAdmin: false,
      });
      result.created++;
      this.logger.debug(`Created user: ${email}`);
    }
  }
}
