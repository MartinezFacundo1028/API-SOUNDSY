import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  SendMessageDto,
  ListChatsDto,
  ChatResponseDto,
  ChatDetailResponseDto,
  MessageResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Chats')
@Controller({ path: 'chats', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar chats del usuario',
    description:
      'Obtiene todos los chats donde el usuario autenticado participa como buyer o seller',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de chats del usuario',
    type: [ChatResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido o expirado',
  })
  async listUserChats(
    @CurrentUser() user: CurrentUserType,
    @Query() query: ListChatsDto,
  ): Promise<ChatResponseDto[]> {
    return await this.chatService.listUserChats(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener chat con mensajes',
    description:
      'Obtiene un chat específico con sus mensajes. Solo accesible para participantes del chat.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del chat',
    example: 'cm2chat123def456ghi789',
  })
  @ApiQuery({
    name: 'messagesCursor',
    description: 'Cursor para paginación de mensajes (ID del último mensaje)',
    required: false,
    example: 'cm2msg123def456ghi789',
  })
  @ApiQuery({
    name: 'messagesLimit',
    description: 'Número máximo de mensajes a retornar',
    required: false,
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Chat con mensajes',
    type: ChatDetailResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder al chat',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  async getChatWithMessages(
    @Param('id') chatId: string,
    @CurrentUser() user: CurrentUserType,
    @Query('messagesCursor') messagesCursor?: string,
    @Query('messagesLimit') messagesLimit: number = 50,
  ): Promise<ChatDetailResponseDto> {
    return await this.chatService.getChatWithMessages(
      chatId,
      user.id,
      messagesCursor,
      messagesLimit,
    );
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Enviar mensaje al chat',
    description:
      'Envía un mensaje al chat. Solo pueden enviar mensajes los participantes del chat.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del chat',
    example: 'cm2chat123def456ghi789',
  })
  @ApiResponse({
    status: 201,
    description: 'Mensaje enviado exitosamente',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para enviar mensajes a este chat',
  })
  @ApiResponse({
    status: 404,
    description: 'Chat no encontrado',
  })
  async sendMessage(
    @Param('id') chatId: string,
    @CurrentUser() user: CurrentUserType,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return await this.chatService.sendMessage(chatId, user.id, sendMessageDto);
  }

  @Patch(':chatId/messages/:messageId/read')
  @ApiOperation({
    summary: 'Marcar mensaje como leído',
    description:
      'Marca un mensaje específico como leído. Solo se pueden marcar como leídos mensajes de otros usuarios.',
  })
  @ApiParam({
    name: 'chatId',
    description: 'ID del chat',
    example: 'cm2chat123def456ghi789',
  })
  @ApiParam({
    name: 'messageId',
    description: 'ID del mensaje',
    example: 'cm2msg123def456ghi789',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensaje marcado como leído',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        readAt: { type: 'string', example: '2025-01-27T10:30:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mensaje ya leído o no se puede marcar como leído',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder al chat',
  })
  async markMessageAsRead(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ success: boolean; readAt: string }> {
    return await this.chatService.markMessageAsRead(chatId, messageId, user.id);
  }

  @Patch(':id/messages/read-all')
  @ApiOperation({
    summary: 'Marcar todos los mensajes como leídos',
    description:
      'Marca todos los mensajes no leídos del chat como leídos. Solo marca mensajes de otros usuarios.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID del chat',
    example: 'cm2chat123def456ghi789',
  })
  @ApiResponse({
    status: 200,
    description: 'Mensajes marcados como leídos',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        markedCount: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder al chat',
  })
  async markAllMessagesAsRead(
    @Param('id') chatId: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<{ success: boolean; markedCount: number }> {
    return await this.chatService.markAllMessagesAsRead(chatId, user.id);
  }
}
