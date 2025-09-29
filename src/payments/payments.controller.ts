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
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.createPayment(dto, user.id);
  }

  @Get()
  async getPayments(
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentsService.getPaymentsByUser(user.id, user.role);
  }

  @Get(':id')
  async getPaymentById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentById(id, user.id, user.role);
  }

  @Patch(':id')
  async updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.updatePayment(id, dto, user.id, user.role);
  }

  @Post(':id/refund')
  async processRefund(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.processRefund(id, user.id, user.role);
  }
}
