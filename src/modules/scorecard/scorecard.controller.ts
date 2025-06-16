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
  NotFoundException,
  // BadRequestException, // Service will throw appropriate exceptions
  ConflictException, // For Swagger documentation
} from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
// import { ApiResponse } from '../../common/dto/api-response.dto'; // Interceptor handles this
import { CreateScorecardDto } from './dto/create-scorecard.dto';
import { ScorecardResponseDto } from './dto/scorecard-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('scorecards')
@Controller('api/v1/scorecards')
export class ScorecardController {
  constructor(private readonly scorecardService: ScorecardService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a scorecard by ID' })
  @ApiParam({ name: 'id', description: 'The Compass scorecard ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The scorecard has been found',
    type: ScorecardResponseDto,
  })
  @SwaggerResponse({
    status: 404,
    description: 'Scorecard not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Scorecard with ID "scorecard-123" not found',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  async getScorecard(
    @Param('id') id: string,
  ): Promise<ScorecardResponseDto> { // Return DTO directly, interceptor formats
    // Service now throws NotFoundException directly.
    return await this.scorecardService.getScorecard(id);
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: 'Get a scorecard by name (Import)' })
  @ApiParam({ name: 'name', description: 'The scorecard name' })
  @SwaggerResponse({
    status: 200,
    description: 'The scorecard has been found',
    type: ScorecardResponseDto,
  })
  @SwaggerResponse({
    status: 404,
    description: 'Scorecard not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Scorecard with name "cost-optimization" not found',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  async getScorecardByName(
    @Param('name') name: string,
  ): Promise<ScorecardResponseDto> { // Return DTO directly
    // Service now throws NotFoundException directly.
    return await this.scorecardService.getScorecardByName(name);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing scorecard' })
  @ApiParam({ name: 'id', description: 'The Compass scorecard ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The scorecard has been updated',
    schema: {
      example: {
        status_code: 200,
        id: 'scorecard-123',
        message: 'Scorecard updated successfully',
      },
    },
  })
  @SwaggerResponse({
    status: 404,
    description: 'Scorecard not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Scorecard with ID "scorecard-123" not found',
        timestamp: '2025-06-02T11:00:00Z',
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
        message: 'Scorecard update validation failed',
        details: [
          {
            field: 'spec.criteria[0].hasMetricValue.metricName',
            error: 'Referenced metric does not exist',
          },
        ],
        timestamp: '2025-06-02T11:00:00Z',
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async updateScorecard(
    @Param('id') id: string,
    @Body() updateScorecardDto: CreateScorecardDto, // Assuming CreateScorecardDto is also used for updates
  ): Promise<any> { // Service returns { scorecard: ScorecardResponseDto; changes: ... }
    // Existence check and change log generation are moved to the service.
    // Service will throw NotFoundException if scorecard not found.
    const result = await this.scorecardService.updateScorecard(id, updateScorecardDto);
    // The TransformInterceptor can format this.
    return {
      message: 'Scorecard updated successfully',
      id: result.scorecard.id,
      changes: result.changes,
      data: result.scorecard, // Include the updated scorecard data
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new scorecard' })
  @SwaggerResponse({
    status: 201,
    description: 'The scorecard has been created',
    schema: {
      example: {
        status_code: 201,
        id: 'scorecard-123',
        message: 'Scorecard created successfully',
        createdAt: '2025-06-02T10:00:00Z',
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
        message: 'Scorecard validation failed',
        details: [
          {
            field: 'spec.componentTypeIds',
            error: 'At least one component type ID is required',
          },
        ],
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  @SwaggerResponse({
    status: 409,
    description: 'Scorecard already exists',
    schema: {
      example: {
        status_code: 409,
        error: 'ALREADY_EXISTS',
        message: 'Scorecard with name "cost-optimization" already exists',
        existingId: 'scorecard-456',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async createScorecard(
    @Body() createScorecardDto: CreateScorecardDto,
  ): Promise<ScorecardResponseDto> { // Service returns ScorecardResponseDto
    // Logic for checking existing scorecard and throwing 409 is moved to service.
    // Service will throw ConflictException.
    // The TransformInterceptor will format the success response.
    return await this.scorecardService.createScorecard(createScorecardDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a scorecard' })
  @ApiParam({ name: 'id', description: 'The Compass scorecard ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The scorecard has been deleted',
    schema: {
      example: {
        status_code: 200,
        message: 'Scorecard deleted successfully',
        deletedId: 'scorecard-123',
        deletedAt: '2025-06-02T12:00:00Z',
      },
    },
  })
  @SwaggerResponse({
    status: 404,
    description: 'Scorecard not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Scorecard with ID "scorecard-123" not found',
        timestamp: '2025-06-02T12:00:00Z',
      },
    },
  })
  async deleteScorecard(@Param('id') id: string): Promise<any> {
    // Existence check is handled by the service (throws NotFoundException).
    // Service may throw ConflictException if deletion fails due to dependencies (basic check).
    const result = await this.scorecardService.deleteScorecard(id); // Service returns { id: string; message: string }
    // The TransformInterceptor can format this.
    return {
      message: result.message,
      deletedId: result.id,
    };
  }

  // generateChangeLog method is now removed from controller, it's in the service.
}
