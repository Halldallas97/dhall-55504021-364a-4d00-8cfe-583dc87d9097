import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  CreateTask,
  TaskItem,
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
}
