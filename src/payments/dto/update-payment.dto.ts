import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentDto {
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'refunded'])
  @IsOptional()
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  paymentIntentId?: string;
}
