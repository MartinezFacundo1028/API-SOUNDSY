import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsString()
  @IsNotEmpty()
  sellerId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  paymentRef?: string;

  /** Si true, la orden se crea como solicitud (REQUESTED) para que el músico apruebe antes de pagar */
  @IsBoolean()
  @IsOptional()
  asRequest?: boolean;
}
