import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto, UpdateDeliveryDto, DeliveryResponseDto } from './dto';
import { DeliveryStatus } from '@prisma/client';


@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async createDelivery(dto: CreateDeliveryDto, userId: string): Promise<DeliveryResponseDto> {
    // Verificar que la orden existe y pertenece al usuario
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      },
      include: {
        service: true,
        buyer: true,
        seller: true
      }
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Verificar que el usuario es el vendedor
    if (order.sellerId !== userId) {
      throw new ForbiddenException('Solo el vendedor puede entregar trabajos');
    }

    // Verificar que la orden está en estado correcto
    if (order.status !== 'IN_PROGRESS' && order.status !== 'PAID') {
      throw new BadRequestException('La orden no está en estado válido para entrega');
    }

    // Crear la entrega
    const delivery = await this.prisma.delivery.create({
      data: {
        orderId: dto.orderId,
        sellerId: userId,
        buyerId: order.buyerId,
        description: dto.description,
        files: dto.files ? JSON.parse(JSON.stringify(dto.files)) : [],
        status: 'DELIVERED',
        deliveryDate: new Date(),
      },
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      }
    });

    // Actualizar estado de la orden
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { status: 'DELIVERED' }
    });

    // TODO: Implementar notificaciones
    console.log(`📦 Entrega creada: ${delivery.id} para orden ${dto.orderId}`);

    return this.mapToResponseDto(delivery);
  }

  async getDeliveriesByUser(userId: string, userRole: string): Promise<DeliveryResponseDto[]> {
    const whereClause = userRole === 'ADMIN' 
      ? {} 
      : {
          OR: [
            { buyerId: userId },
            { sellerId: userId }
          ]
        };

    const deliveries = await this.prisma.delivery.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return deliveries.map(delivery => this.mapToResponseDto(delivery));
  }

  async getDeliveryById(deliveryId: string, userId: string, userRole: string): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      }
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Verificar permisos
    if (userRole !== 'ADMIN' && delivery.buyerId !== userId && delivery.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para ver esta entrega');
    }

    return this.mapToResponseDto(delivery);
  }

  async updateDelivery(deliveryId: string, dto: UpdateDeliveryDto, userId: string, userRole: string): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true }
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Solo el vendedor puede actualizar la entrega
    if (delivery.sellerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el vendedor puede actualizar la entrega');
    }

    // Preparar datos de actualización
    const updateData: any = {
      updatedAt: new Date()
    };

    if (dto.description) updateData.description = dto.description;
    if (dto.status) updateData.status = dto.status;

    // Manejar archivos
    if (dto.newFiles || dto.removeFileIds) {
      const currentFiles = delivery.files as any[];
      let updatedFiles = [...currentFiles];

      // Agregar nuevos archivos
      if (dto.newFiles) {
        updatedFiles = [...updatedFiles, ...dto.newFiles];
      }

      // Remover archivos especificados
      if (dto.removeFileIds) {
        updatedFiles = updatedFiles.filter(file => !dto.removeFileIds!.includes(file.id));
      }

      updateData.files = updatedFiles;
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: updateData,
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      }
    });

    return this.mapToResponseDto(updatedDelivery);
  }

  async approveDelivery(deliveryId: string, userId: string): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true }
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Solo el comprador puede aprobar
    if (delivery.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede aprobar la entrega');
    }

    if (delivery.status !== 'DELIVERED') {
      throw new BadRequestException('La entrega no está en estado válido para aprobación');
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { 
        status: 'APPROVED',
        approvedAt: new Date()
      },
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      }
    });

    // Actualizar estado de la orden
    await this.prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: 'COMPLETED' }
    });

    // TODO: Implementar notificaciones
    console.log(`✅ Entrega aprobada: ${deliveryId} por usuario ${userId}`);

    return this.mapToResponseDto(updatedDelivery);
  }

  async requestRevision(deliveryId: string, dto: { feedback: string }, userId: string): Promise<DeliveryResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true }
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Solo el comprador puede solicitar revisión
    if (delivery.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede solicitar revisión');
    }

    if (delivery.status !== 'DELIVERED') {
      throw new BadRequestException('La entrega no está en estado válido para revisión');
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { 
        status: 'REVISION_REQUIRED',
        feedback: dto.feedback,
        revisionRequestedAt: new Date()
      },
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      }
    });

    // TODO: Implementar notificaciones
    console.log(`🔄 Revisión solicitada: ${deliveryId} por usuario ${userId}`);

    return this.mapToResponseDto(updatedDelivery);
  }

  async getDeliveriesByOrder(orderId: string, userId: string, userRole: string): Promise<DeliveryResponseDto[]> {
    // Verificar que la orden existe y el usuario tiene acceso
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { buyerId: userId },
          { sellerId: userId }
        ]
      }
    });

    if (!order && userRole !== 'ADMIN') {
      throw new ForbiddenException('No tienes permisos para ver las entregas de esta orden');
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: { orderId },
      include: {
        order: {
          include: {
            service: true,
            buyer: true,
            seller: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return deliveries.map(delivery => this.mapToResponseDto(delivery));
  }

  async downloadFile(deliveryId: string, fileId: string, userId: string): Promise<{ file: Buffer, filename: string, mimeType: string }> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true }
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    // Verificar permisos
    if (delivery.buyerId !== userId && delivery.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para descargar este archivo');
    }

    // Buscar el archivo en la entrega
    const files = delivery.files as any[];
    const file = files.find(f => f.id === fileId);
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    // Aquí implementarías la lógica de descarga real
    // Por ahora retornamos datos mock
    return {
      file: Buffer.from('mock file content'),
      filename: file.filename,
      mimeType: file.mimeType
    };
  }

  private mapToResponseDto(delivery: any): DeliveryResponseDto {
    return {
      id: delivery.id,
      orderId: delivery.orderId,
      sellerId: delivery.sellerId,
      buyerId: delivery.buyerId,
      description: delivery.description,
      files: delivery.files,
      status: delivery.status,
      deliveryDate: delivery.deliveryDate,
      approvedAt: delivery.approvedAt,
      revisionRequestedAt: delivery.revisionRequestedAt,
      feedback: delivery.feedback,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
      order: delivery.order
    };
  }
}
