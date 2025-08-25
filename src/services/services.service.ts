import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListServicesDto } from './dto/list-services.dto';

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

  getOne(id: string) {
    return this.prisma.service.findUnique({
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
  }
}
