import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  CreateUser,
  LoginDto,
  LoginResponse,
  User,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { Repository } from 'typeorm';
import { AuthenticationService } from '../auth/authentication.service';
import { OrganizationEntity, UserEntity } from '../database/entities';

const scrypt = promisify(scryptCallback);
const DEFAULT_ORGANIZATION_ID = 'd9581af7-62ed-4dc2-bff8-c7bda25fe65b';
const DEFAULT_ORGANIZATION_NAME = 'Default Organization';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizations: Repository<OrganizationEntity>,
    private readonly authentication: AuthenticationService,
  ) {}

  async createUser(user: CreateUser): Promise<User> {
    if (!user.password) {
      throw new BadRequestException('Password is required');
    }

    const existingUser = await this.users.findOne({ where: { email: user.email } });
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(user.password, salt, 64)) as Buffer;
    const organizationName = user.organizationName?.trim();
    const organization = organizationName
      ? await this.findOrCreateOrganization(organizationName)
      : await this.findOrCreateDefaultOrganization();

    const savedUser = await this.users.save(
      this.users.create({
        name: user.name,
        email: user.email,
        passwordHash: derivedKey.toString('hex'),
        passwordSalt: salt,
        role: 'viewer',
        organizationId: organization.id,
      }),
    );

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      organizationId: savedUser.organizationId,
    };
  }

  async login(credentials: LoginDto): Promise<LoginResponse> {
    const invalidCredentials = new UnauthorizedException('Invalid email or password');
    if (!credentials.email || !credentials.password) {
      throw invalidCredentials;
    }

    const user = await this.users
      .createQueryBuilder('user')
      .addSelect(['user.passwordHash', 'user.passwordSalt'])
      .where('user.email = :email', { email: credentials.email })
      .getOne();
    if (!user) {
      throw invalidCredentials;
    }

    const suppliedPasswordHash = (await scrypt(
      credentials.password,
      user.passwordSalt,
      64,
    )) as Buffer;
    const storedPasswordHash = Buffer.from(user.passwordHash, 'hex');
    const passwordMatches =
      storedPasswordHash.length === suppliedPasswordHash.length &&
      timingSafeEqual(storedPasswordHash, suppliedPasswordHash);
    if (!passwordMatches) {
      throw invalidCredentials;
    }

    return {
      accessToken: this.authentication.createAccessToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  async deleteUser(id: string, authorization?: string): Promise<void> {
    const actor = await this.authentication.authenticate(authorization);
    if (!id) {
      throw new BadRequestException('User id is required');
    }

    const target = await this.users.findOneBy({ id });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    const isSelf = actor.id === target.id;
    const canDeleteOrganizationUser =
      (actor.role === 'admin' || actor.role === 'owner') &&
      actor.organizationId === target.organizationId;
    if (!isSelf && !canDeleteOrganizationUser) {
      throw new ForbiddenException('You cannot delete this user');
    }

    await this.users.delete(target.id);
  }

  private async findOrCreateOrganization(name: string): Promise<OrganizationEntity> {
    const existingOrganization = await this.organizations.findOneBy({ name });
    if (existingOrganization) return existingOrganization;

    try {
      return await this.organizations.save(
        this.organizations.create({ name, parentOrganizationId: null }),
      );
    } catch (error) {
      const concurrentlyCreated = await this.organizations.findOneBy({ name });
      if (concurrentlyCreated) return concurrentlyCreated;
      throw error;
    }
  }

  private async findOrCreateDefaultOrganization(): Promise<OrganizationEntity> {
    const existingDefault = await this.organizations.findOneBy([
      { id: DEFAULT_ORGANIZATION_ID },
      { name: DEFAULT_ORGANIZATION_NAME },
    ]);
    if (existingDefault) return existingDefault;

    try {
      return await this.organizations.save(
        this.organizations.create({
          id: DEFAULT_ORGANIZATION_ID,
          name: DEFAULT_ORGANIZATION_NAME,
          parentOrganizationId: null,
        }),
      );
    } catch (error) {
      const concurrentlyCreated = await this.organizations.findOneBy([
        { id: DEFAULT_ORGANIZATION_ID },
        { name: DEFAULT_ORGANIZATION_NAME },
      ]);
      if (concurrentlyCreated) return concurrentlyCreated;
      throw error;
    }
  }
}
