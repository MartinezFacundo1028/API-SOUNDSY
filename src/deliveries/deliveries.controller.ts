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
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto, UpdateDeliveryDto, DeliveryResponseDto, RequestRevisionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const UPLOADS_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'deliveries');

/**
 * Lista blanca de tipos para subidas de entregas.
 * Reduce riesgo de malware: solo audio y PDF. Para producción, considerar además
 * escanear con ClamAV u otro antivirus antes de guardar.
 */
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.wav', '.mp3', '.flac', '.aiff', '.aif', '.aac', '.ogg', '.m4a', '.opus', '.wma',
]);
/** MIME types permitidos (el cliente puede falsearlos; la extensión también se valida). */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'audio/wav', 'audio/x-wav', 'audio/wave',
  'audio/mpeg', 'audio/mp3',
  'audio/flac',
  'audio/aiff', 'audio/x-aiff',
  'audio/aac', 'audio/aacp',
  'audio/ogg', 'audio/vorbis',
  'audio/mp4', 'audio/x-m4a',
  'audio/opus',
  'audio/x-ms-wma',
]);

function isAllowedFile(file: { originalname?: string; mimetype?: string }): boolean {
  const ext = path.extname((file.originalname || '').toLowerCase());
  const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
  return ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mime);
}

const deliveryFileStorage = diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const base = path.basename(file.originalname || 'file');
    cb(null, `${unique}-${base}`);
  },
});

const deliveryFileFilter = (
  _req: any,
  file: { originalname?: string; mimetype?: string },
  cb: (error: Error | null, accept: boolean) => void,
) => {
  if (!isAllowedFile(file)) {
    return cb(
      new BadRequestException(
        'Solo se permiten archivos de audio (WAV, MP3, FLAC, AAC, OGG, M4A, OPUS) y PDF. No se aceptan ejecutables ni scripts.',
      ) as any,
      false,
    );
  }
  cb(null, true);
};

const multerOptions = {
  storage: deliveryFileStorage,
  fileFilter: deliveryFileFilter,
};

@Controller('deliveries')
@UseGuards(JwtAuthGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async createDelivery(
    @Body() dto: CreateDeliveryDto,
    @UploadedFiles() files: any[],
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    const processedFiles = (files ?? []).map((file, index) => ({
      id: `file_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      filename: file.originalname,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/deliveries/${dto.orderId}/files/${file.originalname}`,
    }));

    const deliveryDto = {
      ...dto,
      files: processedFiles,
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
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async updateDelivery(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryDto,
    @UploadedFiles() files: any[],
    @CurrentUser() user: any,
  ): Promise<DeliveryResponseDto> {
    const newFiles = (files ?? []).map((file, index) => ({
      id: `file_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      filename: file.originalname,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/deliveries/${id}/files/${file.originalname}`,
    }));

    const updateDto = {
      ...dto,
      newFiles,
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
