import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(dto: CreateReviewDto, userId: string): Promise<ReviewResponseDto> {
    // Verificar que la orden existe y pertenece al usuario
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { buyer: true, seller: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Solo el comprador puede crear reseñas
    if (order.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede crear reseñas');
    }

    // Verificar que la orden está completada
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Solo se pueden reseñar órdenes completadas');
    }

    // Verificar que no existe ya una reseña para esta orden
    const existingReview = await this.prisma.review.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingReview) {
      throw new BadRequestException('Ya existe una reseña para esta orden');
    }

    // Crear la reseña
    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        rating: dto.rating,
        comment: dto.comment,
        userId,
      },
      include: {
        order: true,
        User: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Actualizar el rating promedio del servicio
    await this.updateServiceRating(order.serviceId);
    // Actualizar métricas de rating del músico (vendedor)
    await this.updateMusicianRating(order.sellerId);

    return this.mapToResponseDto(review);
  }

  async getReviewsByService(serviceId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        order: {
          serviceId,
        },
      },
      include: {
        order: true,
        User: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(review => this.mapToResponseDto(review));
  }

  async getReviewsByUser(userId: string, userRole: string): Promise<ReviewResponseDto[]> {
    const whereClause = userRole === 'ADMIN' 
      ? {} 
      : {
          OR: [
            { userId }, // Reseñas que el usuario escribió
            {
              order: {
                OR: [
                  { buyerId: userId },
                  { sellerId: userId },
                ],
              },
            },
          ],
        };

    const reviews = await this.prisma.review.findMany({
      where: whereClause,
      include: {
        order: true,
        User: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map(review => this.mapToResponseDto(review));
  }

  async getReviewById(id: string, userId: string, userRole: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        order: true,
        User: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Verificar permisos
    if (userRole !== 'ADMIN' && 
        review.userId !== userId && 
        review.order.buyerId !== userId && 
        review.order.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para ver esta reseña');
    }

    return this.mapToResponseDto(review);
  }

  async updateReview(id: string, dto: UpdateReviewDto, userId: string, userRole: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Solo el autor de la reseña o admin pueden actualizarla
    if (userRole !== 'ADMIN' && review.userId !== userId) {
      throw new ForbiddenException('Solo el autor puede actualizar la reseña');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: dto,
      include: {
        order: true,
        User: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Actualizar el rating promedio del servicio
    await this.updateServiceRating(review.order.serviceId);
    // Actualizar métricas de rating del músico (vendedor)
    await this.updateMusicianRating(review.order.sellerId);

    return this.mapToResponseDto(updatedReview);
  }

  async deleteReview(id: string, userId: string, userRole: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada');
    }

    // Solo el autor de la reseña o admin pueden eliminarla
    if (userRole !== 'ADMIN' && review.userId !== userId) {
      throw new ForbiddenException('Solo el autor puede eliminar la reseña');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    // Actualizar el rating promedio del servicio
    await this.updateServiceRating(review.order.serviceId);
    // Actualizar métricas de rating del músico (vendedor)
    await this.updateMusicianRating(review.order.sellerId);
  }

  private async updateMusicianRating(sellerId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: {
        order: {
          sellerId,
        },
      },
      _count: { id: true },
      _avg: { rating: true },
    });

    const totalReviewsAsMusician = agg._count.id;
    const averageRatingAsMusician = agg._avg.rating ?? 0;

    await this.prisma.user.update({
      where: { id: sellerId },
      data: {
        totalReviewsAsMusician,
        averageRatingAsMusician,
      },
    });
  }

  private async updateServiceRating(serviceId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        order: {
          serviceId,
        },
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      await this.prisma.service.update({
        where: { id: serviceId },
        data: {
          ratingAvg: 0,
          ratingCount: 0,
        },
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ratingAvg: averageRating,
        ratingCount: reviews.length,
      },
    });
  }

  private mapToResponseDto(review: any): ReviewResponseDto {
    return {
      id: review.id,
      orderId: review.orderId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      userId: review.userId,
      order: review.order ? {
        id: review.order.id,
        serviceId: review.order.serviceId,
        buyerId: review.order.buyerId,
        sellerId: review.order.sellerId,
        status: review.order.status,
        amount: review.order.amount,
        currency: review.order.currency,
      } : undefined,
      user: review.User ? {
        id: review.User.id,
        email: review.User.email,
        profile: review.User.profile ? {
          displayName: review.User.profile.displayName,
          avatarUrl: review.User.profile.avatarUrl,
        } : undefined,
      } : undefined,
    };
  }
}
