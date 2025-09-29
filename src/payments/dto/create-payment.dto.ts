import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string; // 'stripe', 'paypal', 'bank_transfer', etc.

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  paymentIntentId?: string; // Para Stripe

  @IsString()
  @IsOptional()
  transactionId?: string; // ID de la transacción del proveedor

  @IsString()
  @IsOptional()
  description?: string;
}
