import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AbstractService } from '../common/services/abstract.service';
import { User, UserDocument } from './entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { LookupPopulateOptions } from '../common/services/abstract.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { CurrentUser } from './types/user.types';
import { LogtoUsersService } from '../logto/services/users.service';
import { GenericDocument } from '../common/entities/abstract.entity';
import { TransactionManager } from '../common/services/transaction.manager';

@Injectable()
export class UserService extends AbstractService<
  UserDocument & GenericDocument,
  CreateUserDto,
  UpdateUserDto
> {
  constructor(
    @InjectModel(User.name) model: Model<UserDocument>,
    transactionManager: TransactionManager,
    private readonly logtoUsersService: LogtoUsersService,
  ) {
    super(model, transactionManager);
  }

  get populator(): LookupPopulateOptions[] {
    return [];
  }

  /**
   * Find a user by ID or email
   */
  async findOne(
    idOrEmail: string,
    currentUser?: CurrentUser,
    session?: ClientSession,
    options?: {
      select?: string | string[];
    },
  ) {
    const user = await this.model
      .findOne(
        {
          $or: [{ _id: idOrEmail }, { email: idOrEmail }],
        },
        {},
        { session },
      )
      .select(options?.select || '');

    if (!user) {
      throw new NotFoundException(`User not found: ${idOrEmail}`);
    }

    return user;
  }

  /**
   * Onboard a user from Logto
   */
  async onboardFromLogto(logtoUserId: string) {
    const existingUser = await this.model.findById(logtoUserId);
    if (existingUser) {
      throw new ConflictException('User is already onboarded');
    }

    const logtoUser = await this.logtoUsersService.findOne(logtoUserId);
    if (!logtoUser) {
      throw new NotFoundException('User not found in Logto');
    }

    const email = logtoUser.primaryEmail;
    const firstName = logtoUser.profile?.givenName || logtoUser.name || '';
    const lastName = logtoUser.profile?.familyName || '';

    if (!email) {
      throw new BadRequestException('User must have an email to be onboarded');
    }

    const existingEmailUser = await this.model.findOne({ email });
    if (existingEmailUser) {
      throw new ConflictException('Email is already in use');
    }

    return this.model.create({
      _id: logtoUserId,
      firstName,
      lastName,
      email,
      isAdmin: false,
    });
  }

  /**
   * Transform a UserDocument to a CurrentUser object
   */
  toCurrentUser(user: UserDocument): CurrentUser {
    return {
      _id: user._id,
      username: user.email,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      isAdmin: user.isAdmin || false,
    };
  }
}
