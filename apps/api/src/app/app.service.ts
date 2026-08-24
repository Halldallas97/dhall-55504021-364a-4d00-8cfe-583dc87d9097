import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { CreateUser, User } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { Repository } from 'typeorm';
import { OrganizationEntity, UserEntity } from './database/entities';

const scrypt = promisify(scryptCallback);
const DEFAULT_ORGANIZATION_ID = 'd9581af7-62ed-4dc2-bff8-c7bda25fe65b';
const DEFAULT_ORGANIZATION_NAME = 'Default Organization';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizations: Repository<OrganizationEntity>,
  ) {}

  async createUser(user: CreateUser): Promise<User> {
    if (!user.password) {
      throw new BadRequestException('Password is required');
    }
    // Check if the email is already in use
    const existingUser = await this.users.findOne({
      where: { email: user.email },
    });
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }
    // Generate a salt and hash the password
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(user.password, salt, 64)) as Buffer;
    const passwordHash = derivedKey.toString('hex');

    const organizationName = user.organizationName?.trim();
    const organization = organizationName
      ? await this.findOrCreateOrganization(organizationName)
      : await this.findOrCreateDefaultOrganization();

    const savedUser = await this.users.save(
      this.users.create({
        name: user.name,
        email: user.email,
        passwordHash,
        passwordSalt: salt,
        role: user.role ?? 'viewer',
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

  private async findOrCreateOrganization(
    name: string,
  ): Promise<OrganizationEntity> {
    const existingOrganization = await this.organizations.findOneBy({ name });
    if (existingOrganization) {
      return existingOrganization;
    }

    try {
      return await this.organizations.save(
        this.organizations.create({
          name,
          parentOrganizationId: null,
        }),
      );
    } catch (error) {
      // A concurrent signup may have created the same organization first.
      const concurrentlyCreatedOrganization =
        await this.organizations.findOneBy({ name });

      if (concurrentlyCreatedOrganization) {
        return concurrentlyCreatedOrganization;
      }

      throw error;
    }
  }

  private async findOrCreateDefaultOrganization(): Promise<OrganizationEntity> {
    const existingDefault = await this.organizations.findOneBy([
      { id: DEFAULT_ORGANIZATION_ID },
      { name: DEFAULT_ORGANIZATION_NAME },
    ]);
    if (existingDefault) {
      return existingDefault;
    }

    try {
      return await this.organizations.save(
        this.organizations.create({
          id: DEFAULT_ORGANIZATION_ID,
          name: DEFAULT_ORGANIZATION_NAME,
          parentOrganizationId: null,
        }),
      );
    } catch (error) {
      const concurrentlyCreatedDefault = await this.organizations.findOneBy([
        { id: DEFAULT_ORGANIZATION_ID },
        { name: DEFAULT_ORGANIZATION_NAME },
      ]);

      if (concurrentlyCreatedDefault) {
        return concurrentlyCreatedDefault;
      }

      throw error;
    }
  }
}
