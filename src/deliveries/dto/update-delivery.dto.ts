import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '@prisma/client';

export class UpdateFileDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsOptional()
  size?: number;
}

export class UpdateDeliveryDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFileDto)
  @IsOptional()
  newFiles?: UpdateFileDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  removeFileIds?: string[];

  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;
}
