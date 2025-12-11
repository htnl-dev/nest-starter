import { AbstractCrudService } from './crud.service';
import { ClientSession, isValidObjectId, Model, Types } from 'mongoose';
import { UpdateCrudDto } from '../dto/update-crud.dto';
import { slugify } from '../utils/slug.utils';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSlugAwareCrudDto } from '../dto/create-slug-crud.dto';
import { SlugCrudEntity } from '../entities/slug-crud.entity';
import { TransactionManager } from './transaction.manager';
import { QueryBuilderService } from './query-builder.service';
import { OptimisticLockingService } from './optimistic-locking.service';
import { EntityEventEmitter } from './entity-event.emitter';
import type { CurrentUser } from '../types/current-user.type';

export abstract class SlugAwareCrudService<
  Entity extends SlugCrudEntity & { __v: number },
  CreateDto extends { slug: string } = CreateSlugAwareCrudDto,
  UpdateDto extends object = UpdateCrudDto,
> extends AbstractCrudService<Entity, CreateDto, UpdateDto> {
  constructor(
    model: Model<Entity>,
    transactionManager: TransactionManager,
    queryBuilder: QueryBuilderService,
    lockingService: OptimisticLockingService,
    entityEvents: EntityEventEmitter,
  ) {
    super(
      model,
      transactionManager,
      queryBuilder,
      lockingService,
      entityEvents,
    );
  }

  slugSource: string = 'name';

  protected getSlugFromSource(createDto: CreateDto): string {
    const slugSource = (createDto as Record<string, unknown>)[
      this.slugSource
    ] as string | undefined;

    if (!slugSource) {
      throw new BadRequestException(`${this.slugSource} is not set`);
    }

    return slugify(slugSource);
  }

  protected async generateUniqueSlug(createDto: CreateDto): Promise<string> {
    const slugSource = (createDto as Record<string, unknown>)[
      this.slugSource
    ] as string | undefined;

    if (!slugSource) {
      throw new BadRequestException(`${this.slugSource} is not set`);
    }

    let slug = this.getSlugFromSource(createDto);

    while (await this.model.exists({ slug })) {
      slug += '-' + Math.random().toString(36).substring(2, 15);
    }

    return slug;
  }

  async create(
    createDto: CreateDto,
    user?: CurrentUser,
    session?: ClientSession,
  ) {
    return this.transactionManager.withTransaction(session, async (session) => {
      const slug = await this.generateUniqueSlug(createDto);
      createDto.slug = slug;
      return super.create(createDto, user, session);
    });
  }

  async findOne(idOrSlug: string | Types.ObjectId, session?: ClientSession) {
    return this.transactionManager.withTransaction(session, async (session) => {
      if (isValidObjectId(idOrSlug)) {
        return super.findOne(idOrSlug, session);
      }

      const result = await this.model
        .findOne({ slug: idOrSlug })
        .populate(this.populator)
        .session(session);

      if (!result) {
        throw new NotFoundException(`${this.modelName} not found`);
      }

      return result;
    });
  }
}
