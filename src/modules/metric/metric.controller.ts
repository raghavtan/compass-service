import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Query,
  // BadRequestException, // No longer explicitly thrown by controller for these cases
  NotFoundException, // Still potentially useful for Swagger, or if controller itself had a reason to throw
  ConflictException, // For Swagger documentation of 409
} from '@nestjs/common';
import { MetricService } from './metric.service';
// import { ApiResponse } from '../../common/dto/api-response.dto'; // Assuming interceptor handles this
import { CreateMetricDto } from './dto/create-metric.dto';
import { UpdateMetricDto } from './dto/update-metric.dto';
import { MetricResponseDto } from './dto/metric-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('metrics')
@Controller('api/v1/metrics')
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a metric by ID' })
  @ApiParam({ name: 'id', description: 'The Compass metric ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The metric has been found',
    type: MetricResponseDto,
  })
  @SwaggerResponse({
    status: 404,
    description: 'Metric not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Metric with ID "metric-12345" not found'
      },
    },
  })
  async getMetric(@Param('id') id: string): Promise<MetricResponseDto> {
    // Service now throws NotFoundException directly.
    return await this.metricService.getMetric(id);
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: 'Get a metric by name (Import)' })
  @ApiParam({ name: 'name', description: 'The metric name' })
  @SwaggerResponse({
    status: 200,
    description: 'The metric has been found',
    type: MetricResponseDto,
  })
  @SwaggerResponse({
    status: 404,
    description: 'Metric not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Metric with name "allocation-efficiency" not found',
      },
    },
  })
  async getMetricByName(
    @Param('name') name: string,
  ): Promise<MetricResponseDto> {
    // Service now throws NotFoundException directly.
    return await this.metricService.getMetricByName(name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new metric' })
  @SwaggerResponse({
    status: 201,
    description: 'The metric has been created',
    schema: {
      example: {
        status_code: 201,
        id: 'metric-67890',
        message: 'Metric created successfully',
      },
    },
  })
  @SwaggerResponse({
    status: 400,
    description: 'Validation Error',
    schema: {
      example: {
        status_code: 400,
        error: 'VALIDATION_ERROR',
        message: 'Metric validation failed',
        details: [
          {
            field: 'spec.grading-system',
            error:
              'Invalid grading system. Must be one of: resiliency, observability, production-readiness, security, cost-optimization',
          },
        ],
      },
    },
  })
  @SwaggerResponse({
    status: 409,
    description: 'Metric already exists',
    schema: {
      example: {
        status_code: 409,
        error: 'ALREADY_EXISTS',
        message: 'Metric with name "allocation-efficiency" already exists',
        existingId: 'metric-54321',
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async createMetric(@Body() createMetricDto: CreateMetricDto): Promise<MetricResponseDto> {
    // Logic for checking existing metric and throwing 409 is moved to service.
    // Service will throw ConflictException.
    // Service returns MetricResponseDto.
    // The TransformInterceptor will format the success response.
    return await this.metricService.createMetric(createMetricDto);
    // Example of how it could be structured by an interceptor (actual structure depends on interceptor):
    // return {
    //   status_code: HttpStatus.CREATED,
    //   message: 'Metric created successfully',
    //   data: createdMetricData, // from service
    // };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing metric' })
  @ApiParam({ name: 'id', description: 'The Compass metric ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The metric has been updated',
    schema: {
      example: {
        status_code: 200,
        id: 'metric-67890',
        message: 'Metric updated successfully',
        changes: [
          {
            field: 'spec.description',
            oldValue: 'Old description',
            newValue: 'Updated description',
          },
        ],
      },
    },
  })
  @SwaggerResponse({
    status: 404,
    description: 'Metric not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Metric with ID "metric-67890" not found',
      },
    },
  })
  @SwaggerResponse({
    status: 400,
    description: 'Validation Error',
    schema: {
      example: {
        status_code: 400,
        error: 'VALIDATION_ERROR',
        message: 'Metric update validation failed',
        details: [
          {
            field: 'spec.cronSchedule',
            error: 'Invalid cron schedule format',
          },
        ],
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async updateMetric(
    @Param('id') id: string,
    @Body() updateMetricDto: UpdateMetricDto,
  ): Promise<any> { // Service returns { metric: MetricResponseDto; changes: ... }
    // Existence check is moved to the service (throws NotFoundException).
    const result = await this.metricService.updateMetric(id, updateMetricDto);
    // The TransformInterceptor can format this into the desired ApiResponse structure.
    return {
      message: 'Metric updated successfully',
      id: result.metric.id,
      changes: result.changes,
      data: result.metric, // Return the updated metric data
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a metric' })
  @ApiParam({ name: 'id', description: 'The Compass metric ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The metric has been deleted',
    schema: {
      example: {
        status_code: 200,
        message: 'Metric deleted successfully',
        deletedId: 'metric-67890',
      },
    },
  })
  @SwaggerResponse({
    status: 404,
    description: 'Metric not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Metric with ID "metric-67890" not found',
      },
    },
  })
  @SwaggerResponse({
    status: 409,
    description: 'Metric in use',
    schema: {
      example: {
        status_code: 409,
        error: 'IN_USE',
        message: 'Cannot delete metric that is referenced by other resources',
        usedBy: [
          {
            type: 'scorecard',
            id: 'scorecard-123',
            name: 'cost-optimization',
          },
          {
            type: 'component',
            id: 'comp-456',
            name: 'simple-service',
          },
        ],
      },
    },
  })
  async deleteMetric(@Param('id') id: string): Promise<any> {
    // Existence check and "in use" check (partial, based on GQL error) are in the service.
    // Service will throw NotFoundException or ConflictException.
    const result = await this.metricService.deleteMetric(id); // Service returns { id: string; message: string }
    // The TransformInterceptor can format this.
    return {
      message: result.message, // Or a static "Metric deleted successfully"
      deletedId: result.id,
    };
  }
}
