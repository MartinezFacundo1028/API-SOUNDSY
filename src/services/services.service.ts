import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListServicesDto } from './dto/list-services.dto';
import { CreateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async list(dto: ListServicesDto) {
    const { musicianId, genre, instrument, limit = 20, cursor } = dto;

    const and: Prisma.ServiceWhereInput[] = [];

    if (musicianId) {
      and.push({ ownerId: musicianId });
    }

    if (genre) {
      and.push({
        genres: { some: { name: { equals: genre, mode: 'insensitive' } } },
      });
    }

    if (instrument) {
      const needle = instrument.toLowerCase().trim();
      // Coincide si el instrumento está en el perfil del dueño O en tags del servicio
      and.push({
        OR: [
          { owner: { profile: { is: { instruments: { has: needle } } } } }, // requiere Profile.instruments: String[]
          { tags: { has: needle } }, // requiere Service.tags: String[]
        ],
      });
    }

    const where = and.length ? { AND: and } : undefined;

    const items = await this.prisma.service.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        // Ajustá estos includes a tu esquema real:
        genres: { select: { name: true } },
        owner: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        samples: true, // si tenés tabla Sample relacionada
      },
    });

    const nextCursor =
      items.length === limit ? items[items.length - 1].id : null;
    const hasMore = !!nextCursor;

    return { items, nextCursor, hasMore };
  }

  async getOne(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        genres: { select: { name: true } },
        owner: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        samples: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async create(dto: CreateServiceDto, ownerId: string) {
    const { genres: genreNames, ...serviceData } = dto;

    // Si hay géneros, validar que existan y conectarlos
    let genreConnections = {};
    if (genreNames && genreNames.length > 0) {
      // 1. Buscar géneros existentes
      const existingGenres = await this.prisma.genre.findMany({
        where: { name: { in: genreNames } },
      });

      // 2. Verificar que todos los géneros existen
      const existingNames = existingGenres.map((g) => g.name);
      const missingNames = genreNames.filter(
        (name) => !existingNames.includes(name),
      );

      // 3. Si hay géneros que no existen, lanzar error
      if (missingNames.length > 0) {
        throw new NotFoundException(
          `Los siguientes géneros no existen: ${missingNames.join(', ')}. Usa solo géneros válidos.`,
        );
      }

      // 4. Conectar solo géneros existentes
      genreConnections = {
        genres: {
          connect: existingNames.map((name) => ({ name })),
        },
      };
    }

    // Crear el servicio
    const service = await this.prisma.service.create({
      data: {
        ...serviceData,
        ownerId,
        ...genreConnections,
      },
      include: {
        genres: { select: { name: true } },
        owner: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        samples: true,
      },
    });

    return service;
  }
}
