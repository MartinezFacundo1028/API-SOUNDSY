import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SendMessageDto,
  ListChatsDto,
  ChatResponseDto,
  ChatDetailResponseDto,
  MessageResponseDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todos los chats del usuario autenticado
   * El usuario puede ser buyer o seller
   */
  async listUserChats(
    userId: string,
    dto: ListChatsDto,
  ): Promise<ChatResponseDto[]> {
    const { cursor, limit = 20 } = dto;

    const whereCondition = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };

    const chats = await this.prisma.chat.findMany({
      where: cursor
        ? {
            ...whereCondition,
            id: { lt: cursor }, // Paginación por cursor
          }
        : whereCondition,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          include: {
            service: {
              select: { id: true, title: true, basePrice: true },
            },
          },
        },
        Message: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            Message: {
              where: {
                senderId: { not: userId },
                readAt: null,
              },
            },
          },
        },
      },
    });

    // Obtener información de buyer y seller
    const userIds = new Set<string>();
    chats.forEach((chat) => {
      userIds.add(chat.buyerId);
      userIds.add(chat.sellerId);
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      include: {
        profile: {
          select: { displayName: true, avatarUrl: true },
        },
      },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    return chats.map((chat) => {
      const buyer = userMap.get(chat.buyerId);
      const seller = userMap.get(chat.sellerId);

      return {
        id: chat.id,
        orderId: chat.orderId,
        service: {
          id: chat.order.service.id,
          title: chat.order.service.title,
          basePrice: chat.order.service.basePrice,
        },
        buyer: {
          id: buyer!.id,
          profile: {
            displayName: buyer!.profile?.displayName || 'Usuario',
            avatarUrl: buyer!.profile?.avatarUrl || null,
          },
        },
        seller: {
          id: seller!.id,
          profile: {
            displayName: seller!.profile?.displayName || 'Usuario',
            avatarUrl: seller!.profile?.avatarUrl || null,
          },
        },
        lastMessage: chat.Message[0]
          ? {
              id: chat.Message[0].id,
              senderId: chat.Message[0].senderId,
              body: chat.Message[0].body,
              attachments: chat.Message[0].attachments as Record<string, any>,
              readAt: chat.Message[0].readAt?.toISOString() || undefined,
              createdAt: chat.Message[0].createdAt.toISOString(),
            }
          : undefined,
        unreadCount: chat._count.Message,
        createdAt: chat.createdAt.toISOString(),
      };
    });
  }

  /**
   * Obtiene un chat específico con sus mensajes
   * Verifica que el usuario tenga acceso al chat
   */
  async getChatWithMessages(
    chatId: string,
    userId: string,
    messagesCursor?: string,
    messagesLimit: number = 50,
  ): Promise<ChatDetailResponseDto> {
    // Verificar acceso al chat
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        order: {
          include: {
            service: {
              select: { id: true, title: true, basePrice: true },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat no encontrado o sin acceso');
    }

    // Obtener mensajes del chat
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        ...(messagesCursor && { id: { lt: messagesCursor } }),
      },
      take: messagesLimit + 1, // +1 para verificar si hay más
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = messages.length > messagesLimit;
    const messagesList = hasMore ? messages.slice(0, -1) : messages;

    // Obtener información de usuarios
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: [chat.buyerId, chat.sellerId] },
      },
      include: {
        profile: {
          select: { displayName: true, avatarUrl: true },
        },
      },
    });

    const buyer = users.find((u) => u.id === chat.buyerId);
    const seller = users.find((u) => u.id === chat.sellerId);

    // Contar mensajes no leídos
    const unreadCount = await this.prisma.message.count({
      where: {
        chatId,
        senderId: { not: userId },
        readAt: null,
      },
    });

    return {
      id: chat.id,
      orderId: chat.orderId,
      service: {
        id: chat.order.service.id,
        title: chat.order.service.title,
        basePrice: chat.order.service.basePrice,
      },
      buyer: {
        id: buyer!.id,
        profile: {
          displayName: buyer!.profile?.displayName || 'Usuario',
          avatarUrl: buyer!.profile?.avatarUrl || null,
        },
      },
      seller: {
        id: seller!.id,
        profile: {
          displayName: seller!.profile?.displayName || 'Usuario',
          avatarUrl: seller!.profile?.avatarUrl || null,
        },
      },
      messages: messagesList.map(
        (msg): MessageResponseDto => ({
          id: msg.id,
          senderId: msg.senderId,
          body: msg.body,
          attachments: msg.attachments as Record<string, any>,
          readAt: msg.readAt?.toISOString() || undefined,
          createdAt: msg.createdAt.toISOString(),
        }),
      ),
      lastMessage: messagesList[0]
        ? {
            id: messagesList[0].id,
            senderId: messagesList[0].senderId,
            body: messagesList[0].body,
            attachments: messagesList[0].attachments as Record<string, any>,
            readAt: messagesList[0].readAt?.toISOString() || undefined,
            createdAt: messagesList[0].createdAt.toISOString(),
          }
        : undefined,
      unreadCount,
      hasMore,
      createdAt: chat.createdAt.toISOString(),
    };
  }

  /**
   * Envía un mensaje al chat
   * Verifica que el usuario tenga acceso y sea participante del chat
   */
  async sendMessage(
    chatId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Verificar que el usuario tenga acceso al chat
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ buyerId: senderId }, { sellerId: senderId }],
      },
    });

    if (!chat) {
      throw new ForbiddenException(
        'No tienes permisos para enviar mensajes a este chat',
      );
    }

    // Crear el mensaje
    const message = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        body: dto.body.trim(),
        attachments: dto.attachments || undefined,
      },
    });

    return {
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      attachments: message.attachments as Record<string, any>,
      readAt: undefined,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /**
   * Marca un mensaje como leído
   * Solo puede marcar como leído si NO es el sender del mensaje
   */
  async markMessageAsRead(
    chatId: string,
    messageId: string,
    userId: string,
  ): Promise<{ success: boolean; readAt: string }> {
    // Verificar acceso al chat
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });

    if (!chat) {
      throw new ForbiddenException('No tienes acceso a este chat');
    }

    // Verificar que el mensaje existe y no es del usuario actual
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        chatId,
        senderId: { not: userId }, // No puede marcar sus propios mensajes
        readAt: null, // Solo si no está leído ya
      },
    });

    if (!message) {
      throw new BadRequestException(
        'Mensaje no encontrado, ya leído, o no puedes marcarlo como leído',
      );
    }

    // Marcar como leído
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });

    return {
      success: true,
      readAt: updatedMessage.readAt!.toISOString(),
    };
  }

  /**
   * Marca TODOS los mensajes de un chat como leídos
   * Solo mensajes que no son del usuario actual
   */
  async markAllMessagesAsRead(
    chatId: string,
    userId: string,
  ): Promise<{ success: boolean; markedCount: number }> {
    // Verificar acceso al chat
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });

    if (!chat) {
      throw new ForbiddenException('No tienes acceso a este chat');
    }

    // Marcar todos los mensajes no leídos como leídos
    const result = await this.prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return {
      success: true,
      markedCount: result.count,
    };
  }

  /**
   * Crea un chat para una orden específica
   * Este método se llamará desde el módulo Orders cuando se cree una orden
   */
  async createChatForOrder(orderId: string): Promise<{ chatId: string }> {
    // Verificar que la orden existe y obtener buyer y seller
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Verificar que no existe ya un chat para esta orden
    const existingChat = await this.prisma.chat.findUnique({
      where: { orderId },
    });

    if (existingChat) {
      return { chatId: existingChat.id };
    }

    // Crear el chat
    const chat = await this.prisma.chat.create({
      data: {
        orderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      },
    });

    return { chatId: chat.id };
  }
}
