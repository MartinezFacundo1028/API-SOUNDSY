import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto, buyerId: string): Promise<OrderResponseDto> {
    // Verificar que el servicio existe
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: { owner: true },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    // Verificar que el comprador no es el mismo que el vendedor
    if (service.ownerId === buyerId) {
      throw new BadRequestException('No puedes comprar tu propio servicio');
    }

    // Verificar que el sellerId coincide con el owner del servicio
    if (service.ownerId !== dto.sellerId) {
      throw new BadRequestException('El vendedor no es el propietario del servicio');
    }

    // Crear la orden
    const order = await this.prisma.order.create({
      data: {
        serviceId: dto.serviceId,
        buyerId,
        sellerId: dto.sellerId,
        amount: dto.amount,
        currency: dto.currency,
        paymentRef: dto.paymentRef,
        status: OrderStatus.PENDING_PAYMENT,
      },
      include: {
        service: {
          include: {
            owner: {
              include: {
                profile: true,
              },
            },
          },
        },
        buyer: {
          include: {
            profile: true,
          },
        },
        seller: {
          include: {
            profile: true,
          },
        },
      },
    });

    return this.mapToResponseDto(order);
  }

  async getOrdersByUser(userId: string, userRole: string): Promise<OrderResponseDto[]> {
    const whereClause = userRole === 'ADMIN' 
      ? {} 
      : {
          OR: [
            { buyerId: userId },
            { sellerId: userId },
          ],
        };

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        service: {
          include: {
            owner: {
              include: {
                profile: true,
              },
            },
          },
        },
        buyer: {
          include: {
            profile: true,
          },
        },
        seller: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(order => this.mapToResponseDto(order));
  }

  async getOrderById(id: string, userId: string, userRole: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            owner: {
              include: {
                profile: true,
              },
            },
          },
        },
        buyer: {
          include: {
            profile: true,
          },
        },
        seller: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Verificar permisos
    if (userRole !== 'ADMIN' && order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para ver esta orden');
    }

    return this.mapToResponseDto(order);
  }

  async updateOrder(id: string, dto: UpdateOrderDto, userId: string, userRole: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Verificar permisos
    if (userRole !== 'ADMIN' && order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para actualizar esta orden');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: dto,
      include: {
        service: {
          include: {
            owner: {
              include: {
                profile: true,
              },
            },
          },
        },
        buyer: {
          include: {
            profile: true,
          },
        },
        seller: {
          include: {
            profile: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updatedOrder);
  }

  async deleteOrder(id: string, userId: string, userRole: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Solo el comprador o admin pueden cancelar
    if (userRole !== 'ADMIN' && order.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede cancelar la orden');
    }

    // Solo se puede cancelar si está pendiente de pago
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Solo se pueden cancelar órdenes pendientes de pago');
    }

    await this.prisma.order.delete({
      where: { id },
    });
  }

  private mapToResponseDto(order: any): OrderResponseDto {
    return {
      id: order.id,
      serviceId: order.serviceId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      paymentRef: order.paymentRef,
      chatId: order.chatId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      service: order.service ? {
        id: order.service.id,
        title: order.service.title,
        description: order.service.description,
        basePrice: order.service.basePrice,
        currency: order.service.currency,
        owner: {
          id: order.service.owner.id,
          email: order.service.owner.email,
          profile: order.service.owner.profile ? {
            displayName: order.service.owner.profile.displayName,
            avatarUrl: order.service.owner.profile.avatarUrl,
          } : undefined,
        },
      } : undefined,
      buyer: order.buyer ? {
        id: order.buyer.id,
        email: order.buyer.email,
        profile: order.buyer.profile ? {
          displayName: order.buyer.profile.displayName,
          avatarUrl: order.buyer.profile.avatarUrl,
        } : undefined,
      } : undefined,
      seller: order.seller ? {
        id: order.seller.id,
        email: order.seller.email,
        profile: order.seller.profile ? {
          displayName: order.seller.profile.displayName,
          avatarUrl: order.seller.profile.avatarUrl,
        } : undefined,
      } : undefined,
    };
  }
}
