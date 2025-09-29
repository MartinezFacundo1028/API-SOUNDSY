import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  async createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: any,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createReview(dto, user.id);
  }

  @Get()
  async getReviews(
    @Query('serviceId') serviceId?: string,
    @CurrentUser() user?: any,
  ): Promise<ReviewResponseDto[]> {
    if (serviceId) {
      return this.reviewsService.getReviewsByService(serviceId);
    }
    return this.reviewsService.getReviewsByUser(user.id, user.role);
  }

  @Get(':id')
  async getReviewById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.getReviewById(id, user.id, user.role);
  }

  @Patch(':id')
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: any,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateReview(id, dto, user.id, user.role);
  }

  @Delete(':id')
  async deleteReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    await this.reviewsService.deleteReview(id, user.id, user.role);
    return { message: 'Reseña eliminada exitosamente' };
  }
}
