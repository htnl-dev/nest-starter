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
import { AbstractCrudService } from '../services/crud.service';
import { CreateCrudDto as AbstractCreateDto } from '../dto/create-crud.dto';
import { UpdateCrudDto as AbstractUpdateDto } from '../dto/update-crud.dto';
import { GenericCrudDocument } from '../entities/crud.entity';
import { QueryDto } from '../dto/crud-query.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CurrentUser } from '../types/current-user.type';

@Controller('crud')
export abstract class AbstractCrudController<
  Entity extends GenericCrudDocument,
  CreateDto extends AbstractCreateDto = AbstractCreateDto,
  UpdateDto extends object = AbstractUpdateDto,
> {
  protected readonly logger = new Logger();

  constructor(
    protected readonly crudService: AbstractCrudService<
      Entity,
      CreateDto,
      UpdateDto
    >,
    protected readonly eventEmitter?: EventEmitter2,
  ) {}

  @Post()
  create(@Body() createCrudDto: CreateDto, user?: CurrentUser) {
    return this.crudService.create(createCrudDto, user);
  }

  @Get()
  findAll(@Query() query: QueryDto) {
    return this.crudService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crudService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCrudDto: UpdateDto) {
    return this.crudService.update(id, updateCrudDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crudService.remove(id);
  }
}
