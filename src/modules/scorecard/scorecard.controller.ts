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
  BadRequestException,
} from '@nestjs/common';
import { ScorecardService } from './scorecard.service';
import { ApiResponse } from '../../common/dto/api-response.dto';
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
  ): Promise<ApiResponse<ScorecardResponseDto>> {
    try {
      const scorecard = await this.scorecardService.getScorecard(id);
      return ApiResponse.success(
        HttpStatus.OK,
        'Scorecard fetched successfully',
        scorecard,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException({
          status_code: 404,
          error: 'NOT_FOUND',
          message: `Scorecard with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
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
  ): Promise<ApiResponse<ScorecardResponseDto>> {
    try {
      const scorecard = await this.scorecardService.getScorecardByName(name);

      if (!scorecard) {
        throw new NotFoundException({
          status_code: 404,
          error: 'NOT_FOUND',
          message: `Scorecard with name '${name}' not found`,
          timestamp: new Date().toISOString(),
        });
      }

      return ApiResponse.success(
        HttpStatus.OK,
        'Scorecard fetched successfully',
        scorecard,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch scorecard: ${error.message}`,
      );
    }
  }

  @Put(':id')
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateScorecard(
    @Param('id') id: string,
    @Body() updateScorecardDto: CreateScorecardDto,
  ): Promise<any> {
    try {
      const existingScorecard = await this.scorecardService.getScorecard(id);
      const updatedScorecard = await this.scorecardService.updateScorecard(
        id,
        updateScorecardDto,
      );

      // Track changes (similar to MetricController)
      const changes = this.generateChangeLog(
        existingScorecard,
        updatedScorecard,
      );

      return {
        status_code: HttpStatus.OK,
        id: id,
        message: 'Scorecard updated successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (error.message.includes('not found')) {
          throw new NotFoundException({
            status_code: 404,
            error: 'NOT_FOUND',
            message: `Scorecard with ID '${id}' not found`,
            timestamp: new Date().toISOString(),
          });
        }
      }
      throw error;
    }
  }

  @Post()
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async createScorecard(
    @Body() createScorecardDto: CreateScorecardDto,
  ): Promise<any> {
    try {
      // Check if scorecard with the same name already exists
      try {
        const existingScorecards =
          await this.scorecardService.getAllScorecards();
        const existingScorecard = existingScorecards.find(
          (s) => s.name === createScorecardDto.spec.name,
        );

        if (existingScorecard) {
          throw {
            status_code: 409,
            error: 'ALREADY_EXISTS',
            message: `Scorecard with name '${createScorecardDto.spec.name}' already exists`,
            existingId: existingScorecard.id,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        // If no scorecard is found, continue with creation
        if (!err.status_code) {
          // This is a different error, not a "not found" error
          throw err;
        }
      }

      const scorecard =
        await this.scorecardService.createScorecard(createScorecardDto);
      return {
        status_code: HttpStatus.CREATED,
        id: scorecard.id,
        message: 'Scorecard created successfully',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error.status_code === 409) {
        throw error;
      }
      throw new BadRequestException({
        status_code: 400,
        error: 'VALIDATION_ERROR',
        message: `Failed to create scorecard: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete(':id')
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
  @HttpCode(HttpStatus.OK)
  async deleteScorecard(@Param('id') id: string): Promise<any> {
    try {
      // First check if the scorecard exists
      await this.scorecardService.getScorecard(id);

      // If it exists, delete it
      await this.scorecardService.deleteScorecard(id);

      return {
        status_code: HttpStatus.OK,
        message: 'Scorecard deleted successfully',
        deletedId: id,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (error.message.includes('not found')) {
          throw new NotFoundException({
            status_code: 404,
            error: 'NOT_FOUND',
            message: `Scorecard with ID '${id}' not found`,
            timestamp: new Date().toISOString(),
          });
        }
      }
      throw error;
    }
  }

  // Helper method to generate change log between original and updated scorecard
  private generateChangeLog(
    original: ScorecardResponseDto,
    updated: ScorecardResponseDto,
  ) {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Compare basic fields
    if (original.name !== updated.name) {
      changes.push({
        field: 'spec.name',
        oldValue: original.name,
        newValue: updated.name,
      });
    }

    if (original.description !== updated.description) {
      changes.push({
        field: 'spec.description',
        oldValue: original.description,
        newValue: updated.description,
      });
    }

    // Compare component type IDs
    if (
      JSON.stringify(original.componentTypeIds) !==
      JSON.stringify(updated.componentTypeIds)
    ) {
      changes.push({
        field: 'spec.componentTypeIds',
        oldValue: original.componentTypeIds,
        newValue: updated.componentTypeIds,
      });
    }

    // Compare criteria
    if (original.criterias?.length !== updated.criterias?.length) {
      changes.push({
        field: 'spec.criteria',
        oldValue: `${original.criterias?.length || 0} criterion`,
        newValue: `${updated.criterias?.length || 0} criteria`,
      });
    } else {
      // Compare individual criteria if same length
      const criteriaChanged =
        JSON.stringify(original.criterias) !==
        JSON.stringify(updated.criterias);
      if (criteriaChanged) {
        changes.push({
          field: 'spec.criteria',
          oldValue: 'Original criteria',
          newValue: 'Updated criteria',
        });
      }
    }

    return changes;
  }
}
