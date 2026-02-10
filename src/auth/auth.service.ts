import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Crear el usuario con su perfil
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        role: dto.role,
        profile: {
          create: {
            displayName: dto.displayName || 'Usuario',
            bio: dto.bio || null,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generar JWT
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName ?? undefined,
        createdAt: user.createdAt.toISOString(),
        averageRatingAsMusician: user.averageRatingAsMusician ?? 0,
        totalReviewsAsMusician: user.totalReviewsAsMusician ?? 0,
        profile: user.profile
          ? {
              displayName: user.profile.displayName,
              bio: user.profile.bio,
              avatarUrl: user.profile.avatarUrl,
            }
          : undefined,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Buscar el usuario
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'No hay ninguna cuenta registrada con ese correo electrónico.',
      );
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña es incorrecta.');
    }

    // Generar JWT
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName ?? undefined,
        createdAt: user.createdAt.toISOString(),
        averageRatingAsMusician: user.averageRatingAsMusician ?? 0,
        totalReviewsAsMusician: user.totalReviewsAsMusician ?? 0,
        profile: user.profile
          ? {
              displayName: user.profile.displayName,
              bio: user.profile.bio,
              avatarUrl: user.profile.avatarUrl,
            }
          : undefined,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.profile?.displayName ?? undefined,
      createdAt: user.createdAt.toISOString(),
      averageRatingAsMusician: user.averageRatingAsMusician ?? 0,
      totalReviewsAsMusician: user.totalReviewsAsMusician ?? 0,
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            bio: user.profile.bio,
            avatarUrl: user.profile.avatarUrl,
          }
        : undefined,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = {
      sub: userId,
      email,
      role,
    };

    return this.jwtService.sign(payload);
  }
}
