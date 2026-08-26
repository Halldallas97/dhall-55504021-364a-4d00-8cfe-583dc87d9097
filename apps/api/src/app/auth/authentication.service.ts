import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities';

const JWT_EXPIRATION_SECONDS = 15 * 60;

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async authenticate(authorization?: string): Promise<UserEntity> {
    const unauthorized = new UnauthorizedException(
      'A valid access token is required',
    );
    const [scheme, token, extra] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token || extra) {
      throw unauthorized;
    }

    try {
      const [header, payload, signature, trailingPart] = token.split('.');
      if (!header || !payload || !signature || trailingPart) {
        throw unauthorized;
      }

      const expectedSignature = createHmac('sha256', this.getJwtSecret())
        .update(`${header}.${payload}`)
        .digest();
      const suppliedSignature = Buffer.from(signature, 'base64url');
      const signatureMatches =
        suppliedSignature.length === expectedSignature.length &&
        timingSafeEqual(suppliedSignature, expectedSignature);

      if (!signatureMatches) {
        throw unauthorized;
      }

      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
        sub?: string;
        exp?: number;
      };
      const now = Math.floor(Date.now() / 1000);

      if (!claims.sub || !claims.exp || claims.exp <= now) {
        throw unauthorized;
      }

      const actor = await this.users.findOneBy({ id: claims.sub });
      if (!actor) {
        throw unauthorized;
      }

      return actor;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw unauthorized;
    }
  }

  createAccessToken(user: UserEntity): string {
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
    const signature = createHmac('sha256', this.getJwtSecret())
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
}
