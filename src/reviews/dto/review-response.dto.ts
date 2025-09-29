export class ReviewResponseDto {
  id: string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  userId?: string;

  // Relaciones
  order?: {
    id: string;
    serviceId: string;
    buyerId: string;
    sellerId: string;
    status: string;
    amount: number;
    currency: string;
  };

  user?: {
    id: string;
    email: string;
    profile?: {
      displayName: string;
      avatarUrl?: string;
    };
  };
}
