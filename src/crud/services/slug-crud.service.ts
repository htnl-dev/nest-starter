import { AbstractCrudService } from './crud.service';
import { ClientSession, Connection, isValidObjectId, Types } from 'mongoose';
import { Model } from 'mongoose';
import { UpdateCrudDto } from '../dto/update-crud.dto';
import { slugify } from '../utils/slug.utils';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSlugAwareCrudDto } from '../dto/create-slug-crud.dto';
import { SlugCrudEntity } from '../entities/slug-crud.entity';
import type { CurrentUser } from '../types/current-user.type';

export abstract class SlugAwareCrudService<
  Entity extends SlugCrudEntity & { __v: number },
  CreateDto extends { slug: string } = CreateSlugAwareCrudDto,
  UpdateDto extends object = UpdateCrudDto,
> extends AbstractCrudService<Entity, CreateDto, UpdateDto> {
  constructor(connection: Connection, model: Model<Entity>) {
    super(connection, model);
  }

  slugSource: string = 'name';

  protected getSlugFromSource(createCrudDto: CreateDto) {
    const slugSource = (createCrudDto as Record<string, unknown>)[
      this.slugSource
    ] as string | undefined;
    if (!slugSource) {
      throw new BadRequestException(`${this.slugSource} is not set`);
    }
    return slugify(slugSource);
  }

  protected async generateUniqueSlug(createCrudDto: CreateDto) {
    const slugSource = (createCrudDto as Record<string, unknown>)[
      this.slugSource
    ] as string | undefined;
    if (!slugSource) {
      throw new BadRequestException(`${this.slugSource} is not set`);
    }

    let slug = this.getSlugFromSource(createCrudDto);

    while (await this.model.exists({ slug })) {
      console.log('slug exists', slug);
      slug += '-' + Math.random().toString(36).substring(2, 15);
    }
    return slug;
  }

  async create(
    createCrudDto: CreateDto,
    user?: CurrentUser,
    session?: ClientSession,
  ) {
    return this.withSession(session, async (session) => {
      const slug = await this.generateUniqueSlug(createCrudDto);
      createCrudDto.slug = slug;
      return super.create(createCrudDto, user, session);
    });
  }

  async findOne(idOrSlug: string | Types.ObjectId, session?: ClientSession) {
    return this.withSession(session, async (session) => {
      if (isValidObjectId(idOrSlug)) {
        return super.findOne(idOrSlug, session);
      }

      const result = await this.model
        .findOne({ slug: idOrSlug })
        .populate(this.populator)
        .session(session);

      if (!result) {
        throw new NotFoundException('Not found');
      }

      return result;
    });
  }
}
