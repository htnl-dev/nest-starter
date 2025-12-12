import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
} from '@nestjs/common';
import { AbstractService } from '../services/abstract.service';
import { AbstractCreateDto } from '../dto/abstract-create.dto';
import { AbstractUpdateDto } from '../dto/abstract-update.dto';
import { GenericDocument } from '../entities/abstract.entity';
import { QueryDto } from '../dto/query.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CurrentUser } from '../types/current-user.type';

@Controller()
export abstract class AbstractController<
  Entity extends GenericDocument,
  CreateDto extends AbstractCreateDto = AbstractCreateDto,
  UpdateDto extends object = AbstractUpdateDto,
> {
  protected readonly logger = new Logger();

  constructor(
    protected readonly service: AbstractService<Entity, CreateDto, UpdateDto>,
    protected readonly eventEmitter?: EventEmitter2,
  ) {}

  @Post()
  create(@Body() createDto: CreateDto, user?: CurrentUser) {
    return this.service.create(createDto, user);
  }

  @Get()
  findMany(@Query() query: QueryDto, user?: CurrentUser) {
    return this.service.findMany(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, user?: CurrentUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
    user?: CurrentUser,
  ) {
    return this.service.update(id, updateDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, user?: CurrentUser) {
    return this.service.remove(id, user);
  }
}
