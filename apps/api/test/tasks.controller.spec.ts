import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressInfo } from 'node:net';
import { DataSource, Repository } from 'typeorm';
import { AuthenticationService } from '../src/app/auth/authentication.service';
import {
  OrganizationEntity,
  TaskEntity,
  UserEntity,
} from '../src/app/database/entities';
import { TasksController } from '../src/app/tasks/tasks.controller';
import { TasksService } from '../src/app/tasks/tasks.service';
import { UsersController } from '../src/app/users/users.controller';
import { UsersService } from '../src/app/users/users.service';

describe('TasksController', () => {
  let app: INestApplication;
  let users: Repository<UserEntity>;
  let tasks: Repository<TaskEntity>;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters';
    const testingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          synchronize: true,
          entities: [OrganizationEntity, UserEntity, TaskEntity],
        }),
        TypeOrmModule.forFeature([OrganizationEntity, UserEntity, TaskEntity]),
      ],
      controllers: [UsersController, TasksController],
      providers: [AuthenticationService, UsersService, TasksService],
    }).compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    const dataSource = testingModule.get(DataSource);
    users = dataSource.getRepository(UserEntity);
    tasks = dataSource.getRepository(TaskEntity);
  });

  afterAll(async () => {
    await app.close();
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  });

  function apiUrl(path: string): string {
    const address = app.getHttpServer().address() as AddressInfo;
    return `http://127.0.0.1:${address.port}/api${path}`;
  }

  async function createUser(
    name: string,
    email: string,
    password: string,
    organizationName?: string,
  ): Promise<{ id: string }> {
    const response = await fetch(apiUrl('/user/create'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, password, organizationName }),
    });
    return (await response.json()) as { id: string };
  }

  async function login(email: string, password: string): Promise<string> {
    const response = await fetch(apiUrl('/user/login'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return ((await response.json()) as { accessToken: string }).accessToken;
  }

  it('creates a task for the signed-in user', async () => {
    const user = await createUser(
      'Task Owner',
      'task.owner@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'task.owner@example.com',
      'SecurePassword123!',
    );

    const response = await fetch(apiUrl('/tasks/create'), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'My task', description: 'Do the work' }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        title: 'My task',
        status: 'new',
        createdByUserId: user.id,
        assigneeId: user.id,
      }),
    );
    await expect(tasks.count()).resolves.toBe(1);
  });

  it('allows an admin to create a task for another organization user', async () => {
    const admin = await createUser(
      'Task Admin',
      'task.admin@example.com',
      'SecurePassword123!',
    );
    const target = await createUser(
      'Task Target',
      'task.target@example.com',
      'SecurePassword123!',
    );
    await users.update(admin.id, { role: 'admin' });
    const accessToken = await login(
      'task.admin@example.com',
      'SecurePassword123!',
    );

    const response = await fetch(apiUrl('/tasks/create'), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Delegated task', userId: target.id }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        createdByUserId: admin.id,
        assigneeId: target.id,
      }),
    );
  });

  it('prevents a viewer from creating a task for another user', async () => {
    await createUser(
      'Viewer Actor',
      'task.viewer@example.com',
      'SecurePassword123!',
    );
    const target = await createUser(
      'Viewer Target',
      'other.viewer@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'task.viewer@example.com',
      'SecurePassword123!',
    );

    const response = await fetch(apiUrl('/tasks/create'), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ title: 'Forbidden task', userId: target.id }),
    });

    expect(response.status).toBe(403);
  });

  it('requires a bearer token', async () => {
    const response = await fetch(apiUrl('/tasks/create'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthenticated task' }),
    });

    expect(response.status).toBe(401);
  });

  it('lists only the signed-in viewer\'s tasks', async () => {
    const viewer = await createUser(
      'List Viewer',
      'list.viewer@example.com',
      'SecurePassword123!',
    );
    const otherViewer = await createUser(
      'Other List Viewer',
      'other.list.viewer@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'list.viewer@example.com',
      'SecurePassword123!',
    );
    const viewerEntity = await users.findOneByOrFail({ id: viewer.id });

    await tasks.save([
      tasks.create({
        title: 'Visible viewer task',
        organizationId: viewerEntity.organizationId,
        createdByUserId: viewer.id,
        assigneeId: viewer.id,
      }),
      tasks.create({
        title: 'Hidden viewer task',
        organizationId: viewerEntity.organizationId,
        createdByUserId: otherViewer.id,
        assigneeId: otherViewer.id,
      }),
    ]);

    const response = await fetch(apiUrl('/tasks/listall'), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const responseBody = (await response.json()) as {
      tasks: Array<{ title: string }>;
    };

    expect(response.status).toBe(200);
    expect(responseBody.tasks.map((task) => task.title)).toContain(
      'Visible viewer task',
    );
    expect(responseBody.tasks.map((task) => task.title)).not.toContain(
      'Hidden viewer task',
    );
  });

  it('allows an admin to list and filter organization tasks', async () => {
    const admin = await createUser(
      'List Admin',
      'list.admin@example.com',
      'SecurePassword123!',
    );
    const firstUser = await createUser(
      'First Filter User',
      'first.filter@example.com',
      'SecurePassword123!',
    );
    const secondUser = await createUser(
      'Second Filter User',
      'second.filter@example.com',
      'SecurePassword123!',
    );
    await users.update(admin.id, { role: 'admin' });
    const accessToken = await login(
      'list.admin@example.com',
      'SecurePassword123!',
    );
    const adminEntity = await users.findOneByOrFail({ id: admin.id });

    await tasks.save([
      tasks.create({
        title: 'First filtered task',
        organizationId: adminEntity.organizationId,
        createdByUserId: admin.id,
        assigneeId: firstUser.id,
      }),
      tasks.create({
        title: 'Second filtered task',
        organizationId: adminEntity.organizationId,
        createdByUserId: admin.id,
        assigneeId: secondUser.id,
      }),
    ]);

    const allResponse = await fetch(apiUrl('/tasks/listall'), {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const allResponseBody = (await allResponse.json()) as {
      tasks: Array<{ title: string }>;
    };
    expect(allResponse.status).toBe(200);
    expect(allResponseBody.tasks.map((task) => task.title)).toEqual(
      expect.arrayContaining(['First filtered task', 'Second filtered task']),
    );

    const filteredResponse = await fetch(
      apiUrl(`/tasks/listall?userId=${firstUser.id}`),
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const filteredResponseBody = (await filteredResponse.json()) as {
      tasks: Array<{
        assigneeId: string;
        title: string;
      }>;
    };
    expect(filteredResponse.status).toBe(200);
    expect(filteredResponseBody.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'First filtered task',
          assigneeId: firstUser.id,
        }),
      ]),
    );
    expect(
      filteredResponseBody.tasks.every(
        (task) => task.assigneeId === firstUser.id,
      ),
    ).toBe(true);
  });

  it('prevents a viewer from filtering tasks by another user', async () => {
    await createUser(
      'Filter Viewer',
      'filter.viewer@example.com',
      'SecurePassword123!',
    );
    const otherUser = await createUser(
      'Filter Target',
      'filter.target@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'filter.viewer@example.com',
      'SecurePassword123!',
    );

    const response = await fetch(
      apiUrl(`/tasks/listall?userId=${otherUser.id}`),
      { headers: { authorization: `Bearer ${accessToken}` } },
    );

    expect(response.status).toBe(403);
  });

  it('requires a bearer token when listing tasks', async () => {
    const response = await fetch(apiUrl('/tasks/listall'));

    expect(response.status).toBe(401);
  });

  it('allows a viewer to move an assigned task forward', async () => {
    const viewer = await createUser(
      'Update Viewer',
      'update.viewer@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'update.viewer@example.com',
      'SecurePassword123!',
    );
    const viewerEntity = await users.findOneByOrFail({ id: viewer.id });
    const task = await tasks.save(
      tasks.create({
        title: 'Viewer update task',
        organizationId: viewerEntity.organizationId,
        createdByUserId: viewer.id,
        assigneeId: viewer.id,
      }),
    );

    const response = await fetch(apiUrl(`/tasks/${task.id}`), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ status: 'in-progress' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: task.id, status: 'in-progress' }),
    );
    await expect(tasks.findOneByOrFail({ id: task.id })).resolves.toEqual(
      expect.objectContaining({ status: 'in-progress' }),
    );
  });

  it('allows a viewer to edit their assigned task content', async () => {
    const viewer = await createUser(
      'Content Viewer',
      'content.viewer@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'content.viewer@example.com',
      'SecurePassword123!',
    );
    const viewerEntity = await users.findOneByOrFail({ id: viewer.id });
    const task = await tasks.save(
      tasks.create({
        title: 'Original viewer title',
        organizationId: viewerEntity.organizationId,
        createdByUserId: viewer.id,
        assigneeId: viewer.id,
      }),
    );

    const response = await fetch(apiUrl(`/tasks/${task.id}`), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Viewer changed title',
        description: 'Viewer changed description',
        status: 'done',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        id: task.id,
        title: 'Viewer changed title',
        description: 'Viewer changed description',
        status: 'done',
      }),
    );
    await expect(tasks.findOneByOrFail({ id: task.id })).resolves.toEqual(
      expect.objectContaining({
        title: 'Viewer changed title',
        description: 'Viewer changed description',
        status: 'done',
      }),
    );
  });

  it('prevents a viewer from updating another user\'s task', async () => {
    const viewer = await createUser(
      'Unassigned Viewer',
      'unassigned.viewer@example.com',
      'SecurePassword123!',
    );
    const assignee = await createUser(
      'Update Assignee',
      'update.assignee@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'unassigned.viewer@example.com',
      'SecurePassword123!',
    );
    const viewerEntity = await users.findOneByOrFail({ id: viewer.id });
    const task = await tasks.save(
      tasks.create({
        title: 'Another user task',
        organizationId: viewerEntity.organizationId,
        createdByUserId: viewer.id,
        assigneeId: assignee.id,
      }),
    );

    const response = await fetch(apiUrl(`/tasks/${task.id}`), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ status: 'done' }),
    });

    expect(response.status).toBe(403);
  });

  it('allows a viewer to reopen a completed task', async () => {
    const viewer = await createUser(
      'Transition Viewer',
      'transition.viewer@example.com',
      'SecurePassword123!',
    );
    const accessToken = await login(
      'transition.viewer@example.com',
      'SecurePassword123!',
    );
    const viewerEntity = await users.findOneByOrFail({ id: viewer.id });
    const task = await tasks.save(
      tasks.create({
        title: 'Completed viewer task',
        status: 'done',
        organizationId: viewerEntity.organizationId,
        createdByUserId: viewer.id,
        assigneeId: viewer.id,
      }),
    );

    const response = await fetch(apiUrl(`/tasks/${task.id}`), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ status: 'in-progress' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({ id: task.id, status: 'in-progress' }),
    );
    await expect(tasks.findOneByOrFail({ id: task.id })).resolves.toEqual(
      expect.objectContaining({ status: 'in-progress' }),
    );
  });

  it('allows an owner to edit any organization task', async () => {
    const owner = await createUser(
      'Update Owner',
      'update.owner@example.com',
      'SecurePassword123!',
    );
    const assignee = await createUser(
      'Owner Update Target',
      'owner.update.target@example.com',
      'SecurePassword123!',
    );
    await users.update(owner.id, { role: 'owner' });
    const accessToken = await login(
      'update.owner@example.com',
      'SecurePassword123!',
    );
    const ownerEntity = await users.findOneByOrFail({ id: owner.id });
    const task = await tasks.save(
      tasks.create({
        title: 'Owner editable task',
        organizationId: ownerEntity.organizationId,
        createdByUserId: assignee.id,
        assigneeId: assignee.id,
      }),
    );

    const response = await fetch(apiUrl(`/tasks/${task.id}`), {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Owner updated task',
        description: 'Updated by owner',
        status: 'done',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        id: task.id,
        title: 'Owner updated task',
        description: 'Updated by owner',
        status: 'done',
      }),
    );
  });

  it('requires a bearer token when updating a task', async () => {
    const response = await fetch(
      apiUrl('/tasks/00000000-0000-0000-0000-000000000000'),
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      },
    );

    expect(response.status).toBe(401);
  });
});
