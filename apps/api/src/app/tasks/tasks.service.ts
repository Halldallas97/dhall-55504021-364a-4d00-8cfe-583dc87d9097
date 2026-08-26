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
  TaskListResponse,
  TaskStatus,
  UpdateTask,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { Repository } from 'typeorm';
import { AuthenticationService } from '../auth/authentication.service';
import { TaskEntity, UserEntity } from '../database/entities';

const TASK_STATUSES: readonly TaskStatus[] = ['new', 'in-progress', 'done'];

const VIEWER_STATUS_TRANSITIONS: Readonly<
  Record<TaskStatus, readonly TaskStatus[]>
> = {
  new: ['new', 'in-progress', 'done'],
  'in-progress': ['in-progress', 'done'],
  done: ['done', 'in-progress'],
};

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
  ): Promise<TaskListResponse> {
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

      return {
        tasks: await this.tasks.find({
          where: {
            organizationId: actor.organizationId,
            assigneeId: actor.id,
          },
        }),
      };
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

    return {
      tasks: await this.tasks.find({
        where: {
          organizationId: actor.organizationId,
          ...(userId ? { assigneeId: userId } : {}),
        },
      }),
    };
  }

  async updateTask(
    id: string,
    update: UpdateTask,
    authorization?: string,
  ): Promise<TaskItem> {
    const actor = await this.authentication.authenticate(authorization);
    if (!hasPermission(actor.role, 'task:update')) {
      throw new ForbiddenException('You do not have permission to update tasks');
    }

    const task = await this.tasks.findOneBy({ id });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.organizationId !== actor.organizationId) {
      throw new ForbiddenException('You cannot update this task');
    }

    const isOrganizationAdministrator =
      actor.role === 'admin' || actor.role === 'owner';
    if (!isOrganizationAdministrator && task.assigneeId !== actor.id) {
      throw new ForbiddenException('You cannot update this task');
    }

    const hasTitle = update?.title !== undefined;
    const hasDescription = update?.description !== undefined;
    const hasStatus = update?.status !== undefined;
    if (!hasTitle && !hasDescription && !hasStatus) {
      throw new BadRequestException('At least one task field is required');
    }

    if (hasStatus) {
      if (!TASK_STATUSES.includes(update.status as TaskStatus)) {
        throw new BadRequestException('Invalid task status');
      }
      if (
        !isOrganizationAdministrator &&
        !VIEWER_STATUS_TRANSITIONS[task.status].includes(
          update.status as TaskStatus,
        )
      ) {
        throw new BadRequestException('Invalid task status transition');
      }
      task.status = update.status as TaskStatus;
    }

    if (hasTitle) {
      if (typeof update.title !== 'string' || !update.title.trim()) {
        throw new BadRequestException('Task title is required');
      }
      task.title = update.title.trim();
    }

    if (hasDescription) {
      if (typeof update.description !== 'string') {
        throw new BadRequestException('Task description must be a string');
      }
      task.description = update.description.trim();
    }

    return this.tasks.save(task);
  }
}
