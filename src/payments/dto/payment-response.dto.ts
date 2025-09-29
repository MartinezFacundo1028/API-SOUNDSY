export class PaymentResponseDto {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentIntentId?: string;
  transactionId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // Relación con la orden
  order?: {
    id: string;
    serviceId: string;
    buyerId: string;
    sellerId: string;
    status: string;
    amount: number;
    currency: string;
  };
}
