import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ProfileResponseDto } from './dto';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        genres: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            averageRatingAsMusician: true,
            totalReviewsAsMusician: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.mapToResponseDto(profile);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    // Verificar que el perfil existe
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        genres: true,
      },
    });

    if (!existingProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.instruments !== undefined) updateData.instruments = dto.instruments;
    if (dto.links !== undefined) updateData.links = dto.links;

    // Manejo de géneros
    if (dto.genres && dto.genres.length > 0) {
      // Validar que todos los géneros existen
      const existingGenres = await this.prisma.genre.findMany({
        where: { name: { in: dto.genres } },
      });

      const existingNames = existingGenres.map((g) => g.name);
      const missingNames = dto.genres.filter(
        (name) => !existingNames.includes(name),
      );

      if (missingNames.length > 0) {
        throw new NotFoundException(
          `Los siguientes géneros no existen: ${missingNames.join(', ')}`,
        );
      }

      // Conectar géneros
      updateData.genres = {
        set: [],
        connect: existingNames.map((name) => ({ name })),
      };
    }

    // Actualizar el perfil
    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: updateData,
      include: {
        genres: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            averageRatingAsMusician: true,
            totalReviewsAsMusician: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updatedProfile);
  }

  private mapToResponseDto(profile: any): ProfileResponseDto {
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio || undefined,
      avatarUrl: profile.avatarUrl || undefined,
      instruments: profile.instruments || [],
      links: (profile.links as Record<string, string>) || undefined,
      genres: profile.genres || [],
      averageRatingAsMusician: profile.user?.averageRatingAsMusician ?? 0,
      totalReviewsAsMusician: profile.user?.totalReviewsAsMusician ?? 0,
    };
  }
}