import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

const MP_API_BASE = 'https://api.mercadopago.com';

@Injectable()
export class MercadoPagoService {
  private readonly accessToken: string;
  /** URL del frontend: usada para back_urls (success, failure, pending). */
  private readonly appUrl: string;
  /** URL de esta API: usada para notification_url (webhook). Si no se define, se usa appUrl. */
  private readonly apiUrl: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN', '');
    // APP_URL = URL del frontend (a donde Mercado Pago redirige al usuario).
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    // API_URL = URL de esta API (para que MP llame al webhook). En dev: http://localhost:3001
    this.apiUrl = this.config.get<string>('API_URL', this.appUrl);
  }

  /**
   * Crea una preferencia de pago en Mercado Pago (Checkout Pro) para una orden.
   * Devuelve la URL init_point para redirigir al usuario al checkout.
   */
  async createPreference(
    orderId: string,
    userId: string,
  ): Promise<{
    initPoint: string;
    preferenceId: string;
    paymentId: string;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        service: true,
        buyer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Solo el comprador puede pagar esta orden');
    }

    if (order.status === OrderStatus.REQUESTED) {
      throw new BadRequestException(
        'La orden debe ser aprobada por el músico antes de pagar',
      );
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        'La orden no está pendiente de pago',
      );
    }

    if (!this.accessToken) {
      throw new BadRequestException(
        'Mercado Pago no está configurado (MERCADOPAGO_ACCESS_TOKEN)',
      );
    }

    // Monto: en MP se envía en unidades (ej. 50.00 para USD). Nuestra orden usa centavos.
    const amountDecimal =
      order.currency === 'USD' ? order.amount / 100 : order.amount;
    const currencyId = order.currency;

    // Crear registro de pago en nuestra DB (pendiente)
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: 'mercadopago',
        status: 'pending',
        description: `Soundsy - ${order.service?.title || 'Servicio'}`,
      },
    });

    const frontUrl = (this.appUrl || '').replace(/\/$/, '');
    if (!frontUrl || frontUrl.includes('undefined')) {
      throw new BadRequestException(
        'APP_URL no está configurada. Definí APP_URL en .env con la URL del frontend (ej: http://localhost:3000).',
      );
    }

    const apiBase = (this.apiUrl || '').replace(/\/$/, '');
    const notificationUrl = `${apiBase}/api/v1/payments/mercadopago/webhook`;
    const backUrlSuccess = `${frontUrl}/payment/success?orderId=${orderId}`;
    const backUrlPending = `${frontUrl}/payment/pending?orderId=${orderId}`;
    const backUrlFailure = `${frontUrl}/payment/failure?orderId=${orderId}`;

    const body = {
      items: [
        {
          id: order.serviceId,
          title: order.service?.title || 'Servicio Soundsy',
          description:
            order.service?.description?.slice(0, 255) || 'Pago por servicio',
          quantity: 1,
          unit_price: amountDecimal,
        },
      ],
      currency_id: currencyId,
      payer: {
        email: order.buyer?.email || undefined,
      },
      back_urls: {
        success: backUrlSuccess,
        failure: backUrlFailure,
        pending: backUrlPending,
      },
      auto_return: 'approved' as const,
      external_reference: orderId,
      notification_url: notificationUrl,
    };

    const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
      throw new BadRequestException(
        `Error al crear preferencia de Mercado Pago: ${err}`,
      );
    }

    const data = await res.json();

    // Guardar preference_id en el pago para referencia
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { paymentIntentId: data.id },
    });

    return {
      initPoint: data.init_point,
      preferenceId: data.id,
      paymentId: payment.id,
    };
  }

  /**
   * Webhook que Mercado Pago llama cuando hay actualizaciones de pago.
   * No usar JWT aquí; Mercado Pago envía POST con type y data.id.
   */
  async handleWebhook(
    type: string,
    dataId: string,
  ): Promise<{ ok: boolean }> {
    if (type !== 'payment') {
      return { ok: true };
    }

    if (!this.accessToken) {
      return { ok: false };
    }

    const res = await fetch(`${MP_API_BASE}/v1/payments/${dataId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      return { ok: false };
    }

    const mpPayment = await res.json();
    const externalRef = mpPayment.external_reference; // orderId
    const status = mpPayment.status; // approved, rejected, pending, etc.

    if (!externalRef) {
      return { ok: true };
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: externalRef,
        paymentMethod: 'mercadopago',
      },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return { ok: true };
    }

    const statusMap: Record<string, string> = {
      approved: 'completed',
      rejected: 'failed',
      cancelled: 'failed',
      refunded: 'refunded',
      charged_back: 'refunded',
      in_process: 'processing',
      pending: 'pending',
    };
    const newStatus = statusMap[status] || 'pending';

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        transactionId: String(mpPayment.id),
      },
    });

    if (newStatus === 'completed') {
      await this.prisma.order.update({
        where: { id: externalRef },
        data: {
          status: OrderStatus.PAID,
          paymentRef: String(mpPayment.id),
        },
      });
    }

    return { ok: true };
  }
}
