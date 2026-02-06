import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercadopago.service';
import {
  CreatePaymentDto,
  CreateMercadoPagoPreferenceDto,
  UpdatePaymentDto,
  PaymentResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private mercadoPagoService: MercadoPagoService,
  ) {}

  @Post('mercadopago/preference')
  @UseGuards(JwtAuthGuard)
  async createMercadoPagoPreference(
    @Body() dto: CreateMercadoPagoPreferenceDto,
    @CurrentUser() user: any,
  ): Promise<{ initPoint: string; preferenceId: string; paymentId: string }> {
    return this.mercadoPagoService.createPreference(dto.orderId, user.id);
  }

  @Post('mercadopago/webhook')
  async mercadoPagoWebhook(
    @Body() body: { type?: string; data?: { id?: string } },
  ): Promise<{ ok: boolean }> {
    const type = body?.type ?? 'payment';
    const dataId = body?.data?.id;
    if (!dataId) {
      return { ok: true };
    }
    return this.mercadoPagoService.handleWebhook(type, String(dataId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createPayment(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPayments(
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentsService.getPaymentsByUser(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentById(id, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.updatePayment(id, dto, user.id, user.role);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  async processRefund(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.processRefund(id, user.id, user.role);
  }
}
