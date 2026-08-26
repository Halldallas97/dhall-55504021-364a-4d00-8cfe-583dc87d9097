/**
 * This file contains the data types used in the application.
 * It defines the structure of the data that is used throughout the application.
 */
export type User = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: Role;
  readonly organizationId: string;
};

export type CreateUser = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly organizationName?: string;
};

export type DeleteUser = Pick<User, 'id'>;

export type Role = 'owner' | 'admin' | 'viewer';

export type Permission =
  | 'task:read'
  | 'task:create'
  | 'task:update'
  | 'task:delete'
  | 'audit:read'
  | 'role:manage';

export type TaskStatus = 'new' | 'in-progress' | 'done';

export type Organization = {
  readonly id: string;
  readonly name: string;
  readonly parentOrganizationId: string | null;
};

export type TaskItem = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly organizationId: string;
  readonly createdByUserId: string;
  readonly assigneeId: string | null;
};

export type TaskListResponse = {
  readonly tasks: TaskItem[];
};

export type LoginDto = {
  readonly email: string;
  readonly password: string;
};

export type CreateTask = {
  readonly title: string;
  readonly description?: string;
  readonly userId?: string;
};

export type UpdateTask = {
  readonly title?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
};

export type LoginResponse = {
  readonly accessToken: string;
  readonly user: User;
};
