import { OrderStatus } from '@prisma/client';

export class OrderResponseDto {
  id: string;
  serviceId: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  paymentRef?: string;
  chatId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relaciones
  service?: {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    currency: string;
    owner: {
      id: string;
      email: string;
      profile?: {
        displayName: string;
        avatarUrl?: string;
      };
    };
  };

  buyer?: {
    id: string;
    email: string;
    profile?: {
      displayName: string;
      avatarUrl?: string;
    };
  };

  seller?: {
    id: string;
    email: string;
    profile?: {
      displayName: string;
      avatarUrl?: string;
    };
  };
}
