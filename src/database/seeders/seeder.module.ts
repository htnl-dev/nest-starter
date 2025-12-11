import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeederService } from './seeder.service';
import { UserSeeder } from './user.seeder';
import { User, UserSchema } from '../../user/entities/user.entity';
import { LogtoModule } from '../../logto/logto.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    LogtoModule,
  ],
  providers: [SeederService, UserSeeder],
  exports: [SeederService],
})
export class SeederModule implements OnModuleInit {
  constructor(
    private readonly seederService: SeederService,
    private readonly userSeeder: UserSeeder,
  ) {}

  onModuleInit() {
    // Register all seeders
    this.seederService.registerSeeders([this.userSeeder]);
  }
}
