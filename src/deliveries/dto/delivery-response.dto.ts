import { DeliveryStatus } from '@prisma/client';

export class FileResponseDto {
  id: string;
  filename: string;
  mimeType: string;
  size?: number;
  url: string;
}

export class OrderResponseDto {
  id: string;
  serviceId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: string;
  paymentRef?: string;
  createdAt: Date;
  updatedAt: Date;
  service?: {
    id: string;
    title: string;
    description: string;
  };
  buyer?: {
    id: string;
    name: string;
    email: string;
  };
  seller?: {
    id: string;
    name: string;
    email: string;
  };
}

export class DeliveryResponseDto {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  description: string;
  files: FileResponseDto[];
  status: DeliveryStatus;
  deliveryDate: Date;
  approvedAt?: Date;
  revisionRequestedAt?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: OrderResponseDto;
}
