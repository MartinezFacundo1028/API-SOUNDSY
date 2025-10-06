import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async sendDeliveryNotification(data: {
    buyerId: string;
    sellerId: string;
    orderId: string;
    deliveryId: string;
    serviceName: string;
  }): Promise<void> {
    // Crear notificación en la base de datos
    await this.prisma.notification.create({
      data: {
        userId: data.buyerId,
        type: NotificationType.DELIVERY_RECEIVED,
        title: '¡Trabajo entregado!',
        message: `El vendedor ha entregado tu trabajo para "${data.serviceName}". Revisa la entrega y aprueba si está todo correcto.`,
        data: {
          orderId: data.orderId,
          deliveryId: data.deliveryId,
          sellerId: data.sellerId
        },
        isRead: false
      }
    });

    // Aquí implementarías envío de email
    await this.sendEmail({
      to: data.buyerId,
      subject: 'Trabajo entregado - Soundsy',
      template: 'delivery-notification',
      data: {
        serviceName: data.serviceName,
        orderId: data.orderId,
        deliveryId: data.deliveryId
      }
    });

    // Aquí implementarías push notification
    await this.sendPushNotification({
      userId: data.buyerId,
      title: '¡Trabajo entregado!',
      body: `El vendedor ha entregado tu trabajo para "${data.serviceName}"`,
      data: {
        type: 'DELIVERY_RECEIVED',
        orderId: data.orderId,
        deliveryId: data.deliveryId
      }
    });
  }

  async sendApprovalNotification(data: {
    sellerId: string;
    buyerId: string;
    orderId: string;
    deliveryId: string;
  }): Promise<void> {
    // Crear notificación en la base de datos
    await this.prisma.notification.create({
      data: {
        userId: data.sellerId,
        type: NotificationType.DELIVERY_APPROVED,
        title: '¡Trabajo aprobado!',
        message: 'El cliente ha aprobado tu entrega. El trabajo ha sido completado exitosamente.',
        data: {
          orderId: data.orderId,
          deliveryId: data.deliveryId,
          buyerId: data.buyerId
        },
        isRead: false
      }
    });

    // Enviar email
    await this.sendEmail({
      to: data.sellerId,
      subject: 'Trabajo aprobado - Soundsy',
      template: 'approval-notification',
      data: {
        orderId: data.orderId,
        deliveryId: data.deliveryId
      }
    });

    // Push notification
    await this.sendPushNotification({
      userId: data.sellerId,
      title: '¡Trabajo aprobado!',
      body: 'El cliente ha aprobado tu entrega',
      data: {
        type: 'DELIVERY_APPROVED',
        orderId: data.orderId,
        deliveryId: data.deliveryId
      }
    });
  }

  async sendRevisionNotification(data: {
    sellerId: string;
    buyerId: string;
    orderId: string;
    deliveryId: string;
    feedback: string;
  }): Promise<void> {
    // Crear notificación en la base de datos
    await this.prisma.notification.create({
      data: {
        userId: data.sellerId,
        type: NotificationType.REVISION_REQUESTED,
        title: 'Revisión solicitada',
        message: `El cliente ha solicitado una revisión de tu entrega. Feedback: "${data.feedback}"`,
        data: {
          orderId: data.orderId,
          deliveryId: data.deliveryId,
          buyerId: data.buyerId,
          feedback: data.feedback
        },
        isRead: false
      }
    });

    // Enviar email
    await this.sendEmail({
      to: data.sellerId,
      subject: 'Revisión solicitada - Soundsy',
      template: 'revision-notification',
      data: {
        orderId: data.orderId,
        deliveryId: data.deliveryId,
        feedback: data.feedback
      }
    });

    // Push notification
    await this.sendPushNotification({
      userId: data.sellerId,
      title: 'Revisión solicitada',
      body: 'El cliente ha solicitado una revisión de tu entrega',
      data: {
        type: 'REVISION_REQUESTED',
        orderId: data.orderId,
        deliveryId: data.deliveryId
      }
    });
  }

  async sendChatNotification(data: {
    recipientId: string;
    senderId: string;
    message: string;
    chatId: string;
    deliveryId?: string;
  }): Promise<void> {
    // Crear notificación en la base de datos
    await this.prisma.notification.create({
      data: {
        userId: data.recipientId,
        type: NotificationType.CHAT_MESSAGE,
        title: 'Nuevo mensaje',
        message: data.message,
        data: {
          chatId: data.chatId,
          senderId: data.senderId,
          deliveryId: data.deliveryId
        },
        isRead: false
      }
    });

    // Push notification
    await this.sendPushNotification({
      userId: data.recipientId,
      title: 'Nuevo mensaje',
      body: data.message,
      data: {
        type: NotificationType.CHAT_MESSAGE,
        chatId: data.chatId,
        senderId: data.senderId
      }
    });
  }

  private async sendEmail(data: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    // Implementar envío de email con servicio como SendGrid, Nodemailer, etc.
    console.log(`📧 Email enviado a ${data.to}: ${data.subject}`);
  }

  private async sendPushNotification(data: {
    userId: string;
    title: string;
    body: string;
    data: any;
  }): Promise<void> {
    // Implementar push notifications con Firebase, OneSignal, etc.
    console.log(`📱 Push notification enviado a ${data.userId}: ${data.title}`);
  }

  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: { isRead: true }
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
}
