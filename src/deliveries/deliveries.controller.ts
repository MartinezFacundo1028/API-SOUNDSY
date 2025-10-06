import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Body, 
  Param, 
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
  Query
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto, UpdateDeliveryDto, DeliveryResponseDto, RequestRevisionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10)) // Máximo 10 archivos
  async createDelivery(
    @Body() dto: CreateDeliveryDto,
    @UploadedFiles() files: any[],
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    // Procesar archivos subidos
    const processedFiles = files?.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/deliveries/${dto.orderId}/files/${file.filename}`
    })) || [];

    const deliveryDto = {
      ...dto,
      files: processedFiles
    };

    return this.deliveriesService.createDelivery(deliveryDto, user.id);
  }

  @Get()
  async getDeliveries(
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto[]> {
    return this.deliveriesService.getDeliveriesByUser(user.id, user.role);
  }

  @Get(':id')
  async getDeliveryById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.getDeliveryById(id, user.id, user.role);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('files', 10))
  async updateDelivery(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
    @UploadedFiles() files: any[],
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    // Procesar nuevos archivos si se subieron
    const newFiles = files?.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/deliveries/${id}/files/${file.filename}`
    })) || [];

    const updateDto = {
      ...dto,
      newFiles: newFiles
    };

    return this.deliveriesService.updateDelivery(id, updateDto, user.id, user.role);
  }

  @Post(':id/approve')
  async approveDelivery(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.approveDelivery(id, user.id);
  }

  @Post(':id/request-revision')
  async requestRevision(
    @Param('id') id: string,
    @Body() dto: RequestRevisionDto,
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    return this.deliveriesService.requestRevision(id, dto, user.id);
  }

  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Param('id') deliveryId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
  ): Promise<void> {
    const fileData = await this.deliveriesService.downloadFile(deliveryId, fileId, user.id);
    
    res.setHeader('Content-Type', fileData.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
    res.send(fileData.file);
  }

  @Get('order/:orderId')
  async getDeliveriesByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto[]> {
    return this.deliveriesService.getDeliveriesByOrder(orderId, user.id, user.role);
  }
}
