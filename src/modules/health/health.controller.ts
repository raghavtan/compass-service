import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '../../common/dto/api-response.dto';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): ApiResponse<{ status: string }> {
    return ApiResponse.success(HttpStatus.OK, 'Service is healthy', {
      status: 'UP',
    });
  }
}
