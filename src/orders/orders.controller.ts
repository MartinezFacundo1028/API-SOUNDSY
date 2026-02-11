import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: any,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(dto, user.id);
  }

  @Get()
  async getOrders(
    @CurrentUser() user: any,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getOrdersByUser(user.id, user.role);
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, user.id, user.role);
  }

  @Patch(':id/approve-request')
  async approveRequest(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<OrderResponseDto> {
    return this.ordersService.approveRequest(id, user.id, user.role);
  }

  @Patch(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: any,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrder(id, dto, user.id, user.role);
  }

  @Delete(':id')
  async deleteOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    await this.ordersService.deleteOrder(id, user.id, user.role);
    return { message: 'Orden cancelada exitosamente' };
  }
}
