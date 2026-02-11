import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from './dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(dto: CreatePaymentDto, userId: string): Promise<PaymentResponseDto> {
    // Verificar que la orden existe y pertenece al usuario
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { buyer: true, seller: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Solo el comprador puede crear el pago
    if (order.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede procesar el pago');
    }

    if (order.status === OrderStatus.REQUESTED) {
      throw new BadRequestException('La orden debe ser aprobada por el músico antes de pagar');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('La orden no está pendiente de pago');
    }

    // Verificar que el monto coincide
    if (order.amount !== dto.amount) {
      throw new BadRequestException('El monto del pago no coincide con el de la orden');
    }

    // Crear el pago
    const payment = await this.prisma.payment.create({
      data: {
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        status: 'pending',
        paymentIntentId: dto.paymentIntentId,
        transactionId: dto.transactionId,
        description: dto.description,
      },
      include: {
        order: true,
      },
    });

    return this.mapToResponseDto(payment);
  }

  async getPaymentsByUser(userId: string, userRole: string): Promise<PaymentResponseDto[]> {
    const whereClause = userRole === 'ADMIN' 
      ? {} 
      : {
          order: {
            OR: [
              { buyerId: userId },
              { sellerId: userId },
            ],
          },
        };

    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map(payment => this.mapToResponseDto(payment));
  }

  async getPaymentById(id: string, userId: string, userRole: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Verificar permisos
    if (userRole !== 'ADMIN' && 
        payment.order.buyerId !== userId && 
        payment.order.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para ver este pago');
    }

    return this.mapToResponseDto(payment);
  }

  async updatePayment(id: string, dto: UpdatePaymentDto, userId: string, userRole: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Verificar permisos
    if (userRole !== 'ADMIN' && 
        payment.order.buyerId !== userId && 
        payment.order.sellerId !== userId) {
      throw new ForbiddenException('No tienes permisos para actualizar este pago');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: dto,
      include: {
        order: true,
      },
    });

    // Si el pago se completó, actualizar el estado de la orden
    if (dto.status === 'completed' && payment.status !== 'completed') {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { 
          status: OrderStatus.PAID,
          paymentRef: dto.transactionId || dto.paymentIntentId,
        },
      });
    }

    return this.mapToResponseDto(updatedPayment);
  }

  async processRefund(id: string, userId: string, userRole: string): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    // Solo el vendedor o admin pueden procesar reembolsos
    if (userRole !== 'ADMIN' && payment.order.sellerId !== userId) {
      throw new ForbiddenException('Solo el vendedor puede procesar reembolsos');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestException('Solo se pueden reembolsar pagos completados');
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: { status: 'refunded' },
      include: {
        order: true,
      },
    });

    // Actualizar el estado de la orden
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { status: OrderStatus.CANCELED },
    });

    return this.mapToResponseDto(updatedPayment);
  }

  private mapToResponseDto(payment: any): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      paymentIntentId: payment.paymentIntentId,
      transactionId: payment.transactionId,
      description: payment.description,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      order: payment.order ? {
        id: payment.order.id,
        serviceId: payment.order.serviceId,
        buyerId: payment.order.buyerId,
        sellerId: payment.order.sellerId,
        status: payment.order.status,
        amount: payment.order.amount,
        currency: payment.order.currency,
      } : undefined,
    };
  }
}
