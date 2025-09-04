import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenresService {
  constructor(private prisma: PrismaService) {}
  async list() {
    return await this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  async getOne(id: string) {
    return await this.prisma.genre.findUnique({ where: { id } });
  }

  async popular(limit = 12) {
    const rows = await this.prisma.genre.findMany({
      take: limit,
      orderBy: { services: { _count: 'desc' } },
      select: {
        id: true,
        name: true,
        _count: { select: { services: true, profiles: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      servicesCount: r._count.services,
      profilesCount: r._count.profiles,
    }));
  }
}
