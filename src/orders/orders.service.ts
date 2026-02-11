import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './dto';
import { OrderStatus } from '@prisma/client';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private chatService: ChatService
  ) {}

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

    const initialStatus = dto.asRequest === true
      ? OrderStatus.REQUESTED
      : OrderStatus.PENDING_PAYMENT;

    // Crear la orden
    const order = await this.prisma.order.create({
      data: {
        serviceId: dto.serviceId,
        buyerId,
        sellerId: dto.sellerId,
        amount: dto.amount,
        currency: dto.currency,
        paymentRef: dto.paymentRef,
        status: initialStatus,
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

    // Crear chat automáticamente para la orden
    let updatedOrder = order;
    try {
      const { chatId } = await this.chatService.createChatForOrder(order.id);
      
      // Actualizar la orden con el chatId
      updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: { chatId },
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
    } catch (error) {
      console.warn('Error creando chat para la orden:', error);
      // No fallar la creación de la orden si hay error con el chat
    }

    return this.mapToResponseDto(updatedOrder);
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

    // Solo el vendedor (o admin) puede pasar REQUESTED → PENDING_PAYMENT
    if (
      dto.status !== undefined &&
      order.status === OrderStatus.REQUESTED &&
      dto.status === OrderStatus.PENDING_PAYMENT
    ) {
      if (userRole !== 'ADMIN' && order.sellerId !== userId) {
        throw new ForbiddenException('Solo el músico puede aprobar la solicitud');
      }
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

    const canCancelPayment = order.status === OrderStatus.PENDING_PAYMENT;
    const canCancelRequest = order.status === OrderStatus.REQUESTED;

    if (!canCancelPayment && !canCancelRequest) {
      throw new BadRequestException('Solo se pueden cancelar órdenes en estado solicitud o pendiente de pago');
    }

    // PENDING_PAYMENT: solo comprador (o admin). REQUESTED: comprador o vendedor (o admin)
    if (userRole !== 'ADMIN' && order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para cancelar esta orden');
    }
    if (order.status === OrderStatus.PENDING_PAYMENT && userRole !== 'ADMIN' && order.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede cancelar la orden pendiente de pago');
    }

    await this.prisma.order.delete({
      where: { id },
    });
  }

  /** Solo el vendedor puede aprobar una solicitud (REQUESTED → PENDING_PAYMENT). */
  async approveRequest(id: string, userId: string, userRole: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        service: { include: { owner: { include: { profile: true } } } },
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status !== OrderStatus.REQUESTED) {
      throw new BadRequestException('Solo se puede aprobar una orden en estado solicitud');
    }

    if (userRole !== 'ADMIN' && order.sellerId !== userId) {
      throw new ForbiddenException('Solo el músico puede aprobar la solicitud');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.PENDING_PAYMENT },
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
