import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  OrganizationEntity,
  TaskEntity,
  UserEntity,
} from './database/entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH ?? 'task-management.sqlite',
      entities: [OrganizationEntity, UserEntity, TaskEntity],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.DATABASE_LOGGING === 'true',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
