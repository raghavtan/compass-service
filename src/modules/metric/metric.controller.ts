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
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MetricService } from './metric.service';
import { ApiResponse } from '../../common/dto/api-response.dto';
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
    try {
      return await this.metricService.getMetric(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException({
          status_code: 404,
          error: 'NOT_FOUND',
          message: `Metric with ID '${id}' not found`,
        });
      }
      throw error;
    }
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
    try {
      return await this.metricService.getMetricByName(name);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException({
          status_code: 404,
          error: 'NOT_FOUND',
          message: `Metric with name '${name}' not found`,
        });
      }
      throw error;
    }
  }

  @Post()
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async createMetric(@Body() createMetricDto: CreateMetricDto): Promise<any> {
    try {
      const metric = await this.metricService.createMetric(createMetricDto);
      return {
        status_code: HttpStatus.CREATED,
        id: metric.id,
        message: 'Metric created successfully',
      };
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        throw {
          status_code: 409,
          error: 'ALREADY_EXISTS',
          message: `Metric with name '${createMetricDto.metadata.name}' already exists`,
          existingId: error.existingId || 'unknown',
        };
      }
      throw error;
    }
  }

  @Put(':id')
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateMetric(
    @Param('id') id: string,
    @Body() updateMetricDto: UpdateMetricDto,
  ): Promise<any> {
    try {
      const result = await this.metricService.updateMetric(id, updateMetricDto);
      return {
        status_code: HttpStatus.OK,
        id: id,
        message: 'Metric updated successfully',
        changes: result.changes || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (error.message.includes('not found')) {
          throw new NotFoundException({
            status_code: 404,
            error: 'NOT_FOUND',
            message: `Metric with ID '${id}' not found`,
          });
        }
      }
      throw error;
    }
  }

  @Delete(':id')
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
    try {
      await this.metricService.deleteMetric(id);
      return {
        status_code: HttpStatus.OK,
        message: 'Metric deleted successfully',
        deletedId: id,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (error.message.includes('not found')) {
          throw new NotFoundException({
            status_code: 404,
            error: 'NOT_FOUND',
            message: `Metric with ID '${id}' not found`,
          });
        }
        if (error.message.includes('in use')) {
          const customError: any = error;
          throw {
            status_code: 409,
            error: 'IN_USE',
            message:
              'Cannot delete metric that is referenced by other resources',
            usedBy: customError.usedBy || [],
          };
        }
      }
      throw error;
    }
  }
}
