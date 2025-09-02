import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListServicesDto, CreateServiceDto, UpdateServiceDto } from './dto';

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

  async updatePartial(id: string, dto: UpdateServiceDto, userId: string) {
    // 1. Verificar que el servicio existe y pertenece al usuario
    const existingService = await this.prisma.service.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!existingService) {
      throw new NotFoundException(
        'Servicio no encontrado o no tienes permisos para editarlo',
      );
    }

    // 2. Preparar datos para actualizar (solo campos que vienen en el DTO)
    const updateData: Partial<Prisma.ServiceUpdateInput> = {};

    // Campos simples - solo si están definidos
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.basePrice !== undefined) updateData.basePrice = dto.basePrice;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.deliveryDays !== undefined)
      updateData.deliveryDays = dto.deliveryDays;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    // 3. Manejo especial para géneros (si se envían)
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
          `Los siguientes géneros no existen: ${missingNames.join(', ')}. Usa solo géneros válidos.`,
        );
      }

      // Reemplazar géneros (disconnect all, connect new ones)
      updateData.genres = {
        set: [], // Limpiar géneros actuales
        connect: existingNames.map((name) => ({ name })),
      };
    }

    // 4. Actualizar el servicio
    const updatedService = await this.prisma.service.update({
      where: { id },
      data: updateData,
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

    return updatedService;
  }

  async replace(id: string, dto: CreateServiceDto, userId: string) {
    // 1. Verificar que el servicio existe y pertenece al usuario
    const existingService = await this.prisma.service.findFirst({
      where: {
        id,
        ownerId: userId,
      },
    });

    if (!existingService) {
      throw new NotFoundException(
        'Servicio no encontrado o no tienes permisos para editarlo',
      );
    }

    // 2. Validar y preparar géneros (si se envían)
    let genreConnections = {};
    if (dto.genres && dto.genres.length > 0) {
      const existingGenres = await this.prisma.genre.findMany({
        where: { name: { in: dto.genres } },
      });

      const existingNames = existingGenres.map((g) => g.name);
      const missingNames = dto.genres.filter(
        (name) => !existingNames.includes(name),
      );

      if (missingNames.length > 0) {
        throw new NotFoundException(
          `Los siguientes géneros no existen: ${missingNames.join(', ')}. Usa solo géneros válidos.`,
        );
      }

      genreConnections = {
        genres: {
          set: [], // Limpiar todos los géneros
          connect: existingNames.map((name) => ({ name })),
        },
      };
    } else {
      // PUT sin géneros = limpiar todos los géneros
      genreConnections = {
        genres: { set: [] },
      };
    }

    // 3. Reemplazar COMPLETAMENTE el servicio
    const replacedService = await this.prisma.service.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        basePrice: dto.basePrice,
        currency: dto.currency || 'USD',
        deliveryDays: dto.deliveryDays,
        tags: dto.tags || [], // Si no se envían tags, array vacío
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

    return replacedService;
  }

  async delete(id: string, userId: string) {
    // 1. Verificar que el servicio existe y pertenece al usuario
    const existingService = await this.prisma.service.findFirst({
      where: {
        id,
        ownerId: userId,
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

    if (!existingService) {
      throw new NotFoundException(
        'Servicio no encontrado o no tienes permisos para eliminarlo',
      );
    }

    // 2. Eliminar el servicio (Prisma maneja automáticamente las relaciones)
    const deletedService = await this.prisma.service.delete({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        basePrice: true,
        createdAt: true,
      },
    });

    // 3. Devolver confirmación con información del servicio eliminado
    return {
      message: 'Servicio eliminado exitosamente',
      deletedService: {
        id: deletedService.id,
        title: deletedService.title,
        description: deletedService.description,
        basePrice: deletedService.basePrice,
        createdAt: deletedService.createdAt,
      },
    };
  }
}
