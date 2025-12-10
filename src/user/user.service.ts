import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuditableService } from '../crud/services/auditable.service';
import { User, UserDocument, UserStatus } from './entities/user.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, ClientSession, PopulateOptions } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { CurrentUser } from './types/user.types';
import { LogtoUsersService } from '../logto/services/users.service';
import { TransitionTable } from '../crud/types/fsm.types';
import { GenericAuditableDocument } from '../crud/entities/auditable.entity';

@Injectable()
export class UserService extends AuditableService<
  UserDocument,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    @InjectConnection() connection: Connection,
    @InjectModel(User.name) model: Model<UserDocument>,
    private readonly logtoUsersService: LogtoUsersService,
    protected readonly eventEmitter?: EventEmitter2,
  ) {
    super(connection, model, eventEmitter);
  }

  get populator(): Array<string | PopulateOptions> {
    return [];
  }

  get transitions(): TransitionTable<GenericAuditableDocument> {
    return {};
  }

  /**
   * Find a user by ID, email, or username
   */
  async findOne(
    idOrIdentifier: string,
    session?: ClientSession,
    options?: {
      select?: string | string[];
      populate?: string[] | PopulateOptions | PopulateOptions[];
    },
  ) {
    const userByIdentifier = await this.model
      .findOne(
        {
          $or: [
            { _id: idOrIdentifier },
            { email: idOrIdentifier },
            { username: idOrIdentifier },
          ],
        },
        {},
        { session },
      )
      .select(options?.select || '')
      .populate(options?.populate || this.populator);

    if (!userByIdentifier) {
      throw new NotFoundException(
        `User not found with id, email, or username: ${idOrIdentifier}`,
      );
    }

    return userByIdentifier;
  }

  /**
   * Onboard a user from Logto
   */
  async onboardFromLogto(logtoUserId: string) {
    // Check if user is already onboarded
    const existingUser = await this.model.findById(logtoUserId);
    if (existingUser) {
      throw new ConflictException('User is already onboarded');
    }

    // Fetch user data from Logto
    const logtoUser = await this.logtoUsersService.findOne(logtoUserId);
    if (!logtoUser) {
      throw new NotFoundException('User not found in Logto');
    }

    const email = logtoUser.primaryEmail;
    const firstName = logtoUser.profile?.givenName || logtoUser.name || '';
    const middleName = logtoUser.profile?.middleName || null;
    const lastName = logtoUser.profile?.familyName || '';
    const username = logtoUser.username;
    const lastLoginAt = logtoUser.lastSignInAt;

    if (!email) {
      throw new BadRequestException('User must have an email to be onboarded');
    }

    const existingEmailUser = await this.model.findOne({ email });
    if (existingEmailUser) {
      throw new ConflictException('Email is already in use by another user');
    }

    if (!username) {
      throw new BadRequestException(
        'User must have a username to be onboarded',
      );
    }

    const existingUsernameUser = await this.model.findOne({ username });
    if (existingUsernameUser) {
      throw new ConflictException('Username is already in use by another user');
    }

    const userData = {
      _id: logtoUserId,
      firstName,
      lastName,
      middleName,
      email,
      username,
      logtoId: logtoUserId,
      isAdmin: false,
      lastSignInAt: lastLoginAt ? new Date(lastLoginAt * 1000) : null,
      status: UserStatus.ACTIVE,
    };

    return this.model.create(userData);
  }

  /**
   * Sync user data from Logto
   */
  async syncUserDataFromLogto(logtoUserId: string): Promise<void> {
    try {
      const user = await this.model.findOne({ logtoId: logtoUserId });
      if (!user) {
        this.logger.warn(`User not found for logtoId: ${logtoUserId}`);
        return;
      }

      const logtoUser = await this.logtoUsersService.findOne(logtoUserId);

      user.firstName = logtoUser.profile?.givenName || logtoUser.name || '';
      user.lastName = logtoUser.profile?.familyName || '';

      await user.save();
    } catch (error) {
      this.logger.error(
        `Failed to sync user data for logtoId: ${logtoUserId}`,
        error,
      );
    }
  }

  /**
   * Track the last sign-in time for a user
   */
  async trackLastSignIn(logtoUserId: string): Promise<void> {
    try {
      const user = await this.model.findOne({ logtoId: logtoUserId });
      if (!user) {
        this.logger.warn(`User not found for logtoId: ${logtoUserId}`);
        return;
      }

      user.lastSignInAt = new Date();
      await user.save();
    } catch (error) {
      this.logger.error(
        `Failed to track last sign in for logtoId: ${logtoUserId}`,
        error,
      );
    }
  }

  /**
   * Set the suspension status of a user
   */
  async setSuspensionStatus(
    userIdentifier: string,
    isSuspended: boolean,
  ): Promise<void> {
    const user = await this.findOne(userIdentifier);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.logtoId) {
      throw new BadRequestException('User is not linked to Logto');
    }

    await this.logtoUsersService.setSuspensionStatus(user.logtoId, isSuspended);

    user.isActive = !isSuspended;
    await user.save();
  }

  /**
   * Transform a UserDocument to a CurrentUser object
   */
  toCurrentUser(user: UserDocument): CurrentUser {
    return {
      _id: user._id,
      username: user.username,
      name: user.fullName || `${user.firstName} ${user.lastName}`,
      email: user.email,
      isAdmin: user.isAdmin || false,
    };
  }
}
