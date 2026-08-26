import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hasPermission } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/auth';
import {
  CreateTask,
  TaskItem,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { Repository } from 'typeorm';
import { AuthenticationService } from '../auth/authentication.service';
import { TaskEntity, UserEntity } from '../database/entities';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasks: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly authentication: AuthenticationService,
  ) {}

  async createTask(
    task: CreateTask,
    authorization?: string,
  ): Promise<TaskItem> {
    const actor = await this.authentication.authenticate(authorization);
    if (!hasPermission(actor.role, 'task:create')) {
      throw new ForbiddenException('You do not have permission to create tasks');
    }

    const title = task.title?.trim();
    if (!title) {
      throw new BadRequestException('Task title is required');
    }

    const assigneeId = task.userId ?? actor.id;
    const assignee = await this.users.findOneBy({ id: assigneeId });
    if (!assignee) {
      throw new NotFoundException('User not found');
    }

    const isSelfAssignment = assignee.id === actor.id;
    const canAssignOrganizationUser =
      (actor.role === 'admin' || actor.role === 'owner') &&
      assignee.organizationId === actor.organizationId;
    if (!isSelfAssignment && !canAssignOrganizationUser) {
      throw new ForbiddenException('You cannot create a task for this user');
    }

    const savedTask = await this.tasks.save(
      this.tasks.create({
        title,
        description: task.description?.trim() ?? '',
        status: 'new',
        organizationId: actor.organizationId,
        createdByUserId: actor.id,
        assigneeId: assignee.id,
      }),
    );

    return {
      id: savedTask.id,
      title: savedTask.title,
      description: savedTask.description,
      status: savedTask.status,
      organizationId: savedTask.organizationId,
      createdByUserId: savedTask.createdByUserId,
      assigneeId: savedTask.assigneeId,
    };
  }

  async listTasks(
    authorization?: string,
    userId?: string,
  ): Promise<TaskItem[]> {
    const actor = await this.authentication.authenticate(authorization);
    if (!hasPermission(actor.role, 'task:read')) {
      throw new ForbiddenException('You do not have permission to read tasks');
    }

    const canReadOrganizationTasks =
      actor.role === 'admin' || actor.role === 'owner';

    if (!canReadOrganizationTasks) {
      if (userId && userId !== actor.id) {
        throw new ForbiddenException('You cannot list tasks for this user');
      }

      return this.tasks.find({
        where: {
          organizationId: actor.organizationId,
          assigneeId: actor.id,
        },
      });
    }

    if (userId) {
      const target = await this.users.findOneBy({ id: userId });
      if (!target) {
        throw new NotFoundException('User not found');
      }
      if (target.organizationId !== actor.organizationId) {
        throw new ForbiddenException('You cannot list tasks for this user');
      }
    }

    return this.tasks.find({
      where: {
        organizationId: actor.organizationId,
        ...(userId ? { assigneeId: userId } : {}),
      },
    });
  }
}
