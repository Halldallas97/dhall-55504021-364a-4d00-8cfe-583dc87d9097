import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressInfo } from 'node:net';
import { DataSource, Repository } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  OrganizationEntity,
  TaskEntity,
  UserEntity,
} from './database/entities';

describe('AppController', () => {
  let app: INestApplication;
  let users: Repository<UserEntity>;
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
        TypeOrmModule.forFeature([OrganizationEntity, UserEntity]),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);

    users = testingModule.get(DataSource).getRepository(UserEntity);
  });

  afterAll(async () => {
    await app.close();

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  // create first user in the database and return 200
  it('creates a user in the database and returns 200', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/user/create`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Dallas Hall',
          email: 'dallas.hall@turbovet.com',
          password: 'SecurePassword123!',
          role: 'owner',
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();
    //validate that user is in the database 
    const storedUser = await users.findOneByOrFail({
      email: 'dallas.hall@turbovet.com',
    });
    //default organization id is d9581af7-62ed-4dc2-bff8-c7bda25fe65b
    expect(storedUser.organizationId).toBe(
      'd9581af7-62ed-4dc2-bff8-c7bda25fe65b',
    );
    expect(storedUser.role).toBe('viewer');
    expect(responseBody.role).toBe('viewer');
    expect(responseBody).not.toHaveProperty('password');
    expect(responseBody).not.toHaveProperty('passwordHash');
  });

  it('returns 400 when a user creates an account with an existing email', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/user/create`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Another Dallas Hall',
          email: 'dallas.hall@turbovet.com',
          password: 'AnotherSecurePassword123!',
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it('creates different password hashes for users with the same password', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const password = 'SharedSecurePassword123!';

    const responses = await Promise.all(
      [
        { name: 'First User', email: 'first.user@turbovet.com' },
        { name: 'Second User', email: 'second.user@turbovet.com' },
      ].map((user) =>
        fetch(`http://127.0.0.1:${address.port}/api/user/create`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...user, password }),
        }),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([200, 200]);

    const storedUsers = await users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email IN (:...emails)', {
        emails: ['first.user@turbovet.com', 'second.user@turbovet.com'],
      })
      .getMany();

    expect(storedUsers).toHaveLength(2);
    expect(storedUsers[0].passwordHash).not.toBe(storedUsers[1].passwordHash);
  });

  it('logs in a user and returns a signed JWT', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/user/login`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'dallas.hall@turbovet.com',
          password: 'SecurePassword123!',
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = (await response.json()) as { accessToken: string };
    const tokenParts = responseBody.accessToken.split('.');
    const payload = JSON.parse(
      Buffer.from(tokenParts[1], 'base64url').toString('utf8'),
    );

    expect(tokenParts).toHaveLength(3);
    expect(payload).toEqual(
      expect.objectContaining({
        email: 'dallas.hall@turbovet.com',
        role: 'viewer',
        organizationId: 'd9581af7-62ed-4dc2-bff8-c7bda25fe65b',
      }),
    );
    expect(payload.sub).toEqual(expect.any(String));
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('returns 401 when the password is incorrect', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/user/login`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'dallas.hall@turbovet.com',
          password: 'WrongPassword123!',
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it('logs out a user', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    const loginResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/user/login`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'dallas.hall@turbovet.com',
          password: 'SecurePassword123!',
        }),
      },
    );
    const { accessToken } = (await loginResponse.json()) as {
      accessToken: string;
    };

    const logoutResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/user/logout`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );

    expect(logoutResponse.status).toBe(204);
  });

});
