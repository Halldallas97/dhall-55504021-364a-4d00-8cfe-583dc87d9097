import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateTask,
  TaskItem,
  TaskListResponse,
  UpdateTask,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('create')
  createTask(
    @Body() task: CreateTask,
    @Headers('authorization') authorization?: string,
  ): Promise<TaskItem> {
    return this.tasksService.createTask(task, authorization);
  }

  @Get('listall')
  listTasks(
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ): Promise<TaskListResponse> {
    return this.tasksService.listTasks(authorization, userId);
  }

  @Put(':id')
  updateTask(
    @Param('id') id: string,
    @Body() task: UpdateTask,
    @Headers('authorization') authorization?: string,
  ): Promise<TaskItem> {
    return this.tasksService.updateTask(id, task, authorization);
  }
}
