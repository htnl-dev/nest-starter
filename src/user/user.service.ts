import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AbstractCrudService } from '../crud/services/crud.service';
import { User, UserDocument } from './entities/user.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, ClientSession, PopulateOptions } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { CurrentUser } from './types/user.types';
import { LogtoUsersService } from '../logto/services/users.service';
import { GenericCrudDocument } from '../crud/entities/crud.entity';

@Injectable()
export class UserService extends AbstractCrudService<
  UserDocument & GenericCrudDocument,
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

  /**
   * Find a user by ID or email
   */
  async findOne(
    idOrEmail: string,
    session?: ClientSession,
    options?: {
      select?: string | string[];
      populate?: string[] | PopulateOptions | PopulateOptions[];
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
      .select(options?.select || '')
      .populate(options?.populate || this.populator);

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
      logtoId: logtoUserId,
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
