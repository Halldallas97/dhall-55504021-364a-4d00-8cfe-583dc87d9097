import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import {
  CreateUser,
  LoginDto,
  LoginResponse,
  User,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';
import { Repository } from 'typeorm';
import { OrganizationEntity, UserEntity } from './database/entities';

const scrypt = promisify(scryptCallback);
const DEFAULT_ORGANIZATION_ID = 'd9581af7-62ed-4dc2-bff8-c7bda25fe65b';
const DEFAULT_ORGANIZATION_NAME = 'Default Organization';
const JWT_EXPIRATION_SECONDS = 15 * 60;

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
    const invalidCredentials = new UnauthorizedException(
      'Invalid email or password',
    );

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

    return { accessToken: this.createAccessToken(user) };
  }

  private createAccessToken(user: UserEntity): string {
    const secret = this.getJwtSecret();
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + JWT_EXPIRATION_SECONDS;

    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        iat: issuedAt,
        exp: expiresAt,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException('JWT_SECRET is not configured');
    }

    return secret;
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
