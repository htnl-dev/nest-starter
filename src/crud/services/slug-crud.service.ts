import { AbstractCrudService } from './crud.service';
import { ClientSession, Connection, isValidObjectId, Types } from 'mongoose';
import { Model } from 'mongoose';
import { UpdateCrudDto } from '../dto/update-crud.dto';
import { UserDocument } from 'src/user/entities/user.entity';
import { slugify } from '../utils/slug.utils';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSlugAwareCrudDto } from '../dto/create-slug-crud.dto';
import { SlugCrudEntity } from '../entities/slug-crud.entity';

export abstract class SlugAwareCrudService<
  Entity extends SlugCrudEntity,
  CreateDto extends { slug: string } = CreateSlugAwareCrudDto,
  UpdateDto extends {} = UpdateCrudDto,
> extends AbstractCrudService<Entity, CreateDto, UpdateDto> {
  constructor(connection: Connection, model: Model<Entity>) {
    super(connection, model);
  }

  slugSource: string = 'name';

  protected getSlugFromSource(createCrudDto: CreateDto) {
    const slugSource = createCrudDto[this.slugSource];
    if (!slugSource) {
      throw new BadRequestException(`${this.slugSource} is not set`);
    }
    return slugify(slugSource);
  }

  protected async generateUniqueSlug(createCrudDto: CreateDto) {
    const slugSource = createCrudDto[this.slugSource];
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
    user?: UserDocument,
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

      idOrSlug = idOrSlug as string;
      const query: Record<string, any> = { slug: idOrSlug };

      if (idOrSlug.includes('/')) {
        const [workspaceId, slug] = idOrSlug.split('/');
        query.slug = slug;
        query.workspace = new Types.ObjectId(workspaceId);
      }

      const result = await this.model
        .findOne(query)
        .populate(this.populator)
        .session(session);

      if (!result) {
        throw new NotFoundException('Not found');
      }

      return result;
    });
  }
}
