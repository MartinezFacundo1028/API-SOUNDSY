import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'ID único del mensaje',
    example: 'cm2msg123def456ghi789',
  })
  id: string;

  @ApiProperty({
    description: 'ID del usuario que envió el mensaje',
    example: 'cm2user123def456ghi789',
  })
  senderId: string;

  @ApiProperty({
    description: 'Contenido del mensaje',
    example: '¡Hola! Me interesa tu servicio de mezcla.',
  })
  body: string;

  @ApiProperty({
    description: 'Archivos adjuntos',
    example: {
      files: [{ url: 'https://...', name: 'demo.mp3', type: 'audio/mp3' }],
    },
    required: false,
  })
  attachments?: Record<string, any>;

  @ApiProperty({
    description: 'Fecha y hora de lectura del mensaje',
    example: '2025-01-27T10:30:00Z',
    required: false,
  })
  readAt?: string;

  @ApiProperty({
    description: 'Fecha y hora de creación del mensaje',
    example: '2025-01-27T10:15:00Z',
  })
  createdAt: string;
}

export class ChatParticipantDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: 'cm2user123def456ghi789',
  })
  id: string;

  @ApiProperty({
    description: 'Profile del usuario',
    example: {
      displayName: 'Juan Pérez',
      avatarUrl: 'https://...',
    },
  })
  profile: {
    displayName: string;
    avatarUrl: string | null;
  };
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'ID único del chat',
    example: 'cm2chat123def456ghi789',
  })
  id: string;

  @ApiProperty({
    description: 'ID de la orden asociada',
    example: 'cm2order123def456ghi789',
  })
  orderId: string;

  @ApiProperty({
    description: 'Información del servicio',
    example: {
      id: 'cm2service123',
      title: 'Mezcla profesional de rock',
      basePrice: 5000,
    },
  })
  service: {
    id: string;
    title: string;
    basePrice: number;
  };

  @ApiProperty({
    description: 'Usuario comprador',
    type: ChatParticipantDto,
  })
  buyer: ChatParticipantDto;

  @ApiProperty({
    description: 'Usuario vendedor',
    type: ChatParticipantDto,
  })
  seller: ChatParticipantDto;

  @ApiProperty({
    description: 'Último mensaje del chat',
    type: MessageResponseDto,
    required: false,
  })
  lastMessage?: MessageResponseDto;

  @ApiProperty({
    description: 'Número de mensajes no leídos para el usuario actual',
    example: 3,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Fecha y hora de creación del chat',
    example: '2025-01-27T09:00:00Z',
  })
  createdAt: string;
}

export class ChatDetailResponseDto extends ChatResponseDto {
  @ApiProperty({
    description: 'Mensajes del chat (paginados)',
    type: [MessageResponseDto],
  })
  messages: MessageResponseDto[];

  @ApiProperty({
    description: 'Indica si hay más mensajes disponibles',
    example: false,
  })
  hasMore: boolean;
}
