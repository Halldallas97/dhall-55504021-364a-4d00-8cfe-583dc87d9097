import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationService } from './auth/authentication.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
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
    TypeOrmModule.forFeature([OrganizationEntity, UserEntity, TaskEntity]),
  ],
  controllers: [UsersController, TasksController],
  providers: [AuthenticationService, UsersService, TasksService],
})
export class AppModule {}
