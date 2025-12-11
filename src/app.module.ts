import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SeederModule } from './database/seeders/seeder.module';
import { CrudModule } from './crud/crud.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true,
    }),
    CrudModule,
    SeederModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
