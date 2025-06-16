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
import { ComponentService } from './component.service';
import { ApiResponse } from '../../common/dto/api-response.dto';
import {
  CreateComponentDto,
  UpdateComponentDto,
} from './dto/create-component.dto';
import { ComponentResponseDto } from './dto/component-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('components')
@Controller('api/v1/components')
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a component by ID' })
  @ApiParam({ name: 'id', description: 'The Compass component ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The component has been found',
    type: ComponentResponseDto,
  })
  @SwaggerResponse({
    status: 404,
    description: 'Component not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Component with ID "comp-12345" not found',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  @SwaggerResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        status_code: 400,
        error: 'INVALID_ID',
        message: 'Invalid component ID format',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  async getComponent(@Param('id') id: string): Promise<ComponentResponseDto> {
    try {
      return await this.componentService.getComponent(id);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException({
          status_code: 404,
          error: 'NOT_FOUND',
          message: `Component with ID '${id}' not found`,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Get('by-name/:name')
  @ApiOperation({ summary: 'Get a component by name (Import)' })
  @ApiParam({ name: 'name', description: 'The component name' })
  @SwaggerResponse({
    status: 200,
    description: 'The component has been found',
    type: ComponentResponseDto,
  })
  @SwaggerResponse({
    status: 404,
    description: 'Component not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Component with name "simple-service" not found',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  async getComponentByName(
    @Param('name') name: string,
  ): Promise<ComponentResponseDto> {
    try {
      return await this.componentService.getComponentByName(name);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new NotFoundException({
          status_code: 404,
          error: 'NOT_FOUND',
          message: `Component with name '${name}' not found`,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all components' })
  @SwaggerResponse({
    status: 200,
    description: 'Components fetched successfully',
    type: [ComponentResponseDto],
  })
  async getAllComponents(): Promise<ApiResponse<ComponentResponseDto[]>> {
    const componentList = await this.componentService.getAllComponents();
    return ApiResponse.success(
      HttpStatus.OK,
      'Components fetched successfully',
      componentList,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new component' })
  @SwaggerResponse({
    status: 201,
    description: 'The component has been created',
    schema: {
      example: {
        status_code: 201,
        id: 'comp-12345',
        message: 'Component created successfully',
        metricSources: [
          {
            metricName: 'allocation-efficiency',
            metricId: 'metric-67890',
            metricSourceId: 'ms-11111',
          },
        ],
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
        message: 'Component validation failed',
        details: [
          {
            field: 'spec.typeId',
            error:
              'Invalid typeId. Must be one of: SERVICE, LIBRARY, WEBSITE, APPLICATION, TEMPLATE, RUNTIME',
          },
          {
            field: 'spec.name',
            error: 'Component name is required',
          },
        ],
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  @SwaggerResponse({
    status: 409,
    description: 'Component already exists',
    schema: {
      example: {
        status_code: 409,
        error: 'ALREADY_EXISTS',
        message: 'Component with name "simple-service" already exists',
        existingId: 'comp-54321',
        timestamp: '2025-06-02T10:00:00Z',
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createComponent(
    @Body() createComponentDto: CreateComponentDto,
  ): Promise<any> {
    try {
      // Check if component with the same name already exists
      try {
        const existingComponent =
          await this.componentService.getComponentByName(
            createComponentDto.spec.name,
          );
        if (existingComponent) {
          throw {
            status_code: 409,
            error: 'ALREADY_EXISTS',
            message: `Component with name '${createComponentDto.spec.name}' already exists`,
            existingId: existingComponent.id,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        // If component not found, continue with creation
        if (!err.status_code) {
          throw err;
        }
      }

      const component =
        await this.componentService.createComponent(createComponentDto);
      return {
        status_code: HttpStatus.CREATED,
        id: component.id,
        message: 'Component created successfully',
        metricSources: component.metricSources || [],
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error.status_code === 409) {
        throw error;
      }
      throw new BadRequestException({
        status_code: 400,
        error: 'VALIDATION_ERROR',
        message: `Failed to create component: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing component' })
  @ApiParam({ name: 'id', description: 'The Compass component ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The component has been updated',
    schema: {
      example: {
        status_code: 200,
        id: 'comp-12345',
        message: 'Component updated successfully',
        updatedAt: '2025-06-02T11:00:00Z',
        changes: [
          {
            field: 'spec.description',
            oldValue: 'Simple-service is a no-nonsense service',
            newValue: 'Updated description for simple-service',
          },
          {
            field: 'spec.dependsOn',
            oldValue: [],
            newValue: ['dependency-service'],
          },
        ],
      },
    },
  })
  @SwaggerResponse({
    status: 404,
    description: 'Component not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Component with ID "comp-12345" not found',
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
        message: 'Component update validation failed',
        details: [
          {
            field: 'spec.dependsOn',
            error: 'Dependency "dependency-service" not found',
          },
        ],
        timestamp: '2025-06-02T11:00:00Z',
      },
    },
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateComponent(
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ): Promise<any> {
    try {
      const existingComponent = await this.componentService.getComponent(id);
      const result = await this.componentService.updateComponent(
        id,
        updateComponentDto,
      );

      // Generate change log
      const changes = this.generateChangeLog(
        existingComponent,
        result.component,
      );

      return {
        status_code: HttpStatus.OK,
        id: id,
        message: 'Component updated successfully',
        updatedAt: new Date().toISOString(),
        changes: changes || [],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        if (error.message.includes('not found')) {
          throw new NotFoundException({
            status_code: 404,
            error: 'NOT_FOUND',
            message: `Component with ID '${id}' not found`,
            timestamp: new Date().toISOString(),
          });
        }
      }
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a component' })
  @ApiParam({ name: 'id', description: 'The Compass component ID' })
  @SwaggerResponse({
    status: 200,
    description: 'The component has been deleted',
    schema: {
      example: {
        status_code: 200,
        message: 'Component deleted successfully',
        deletedId: 'comp-12345',
        deletedAt: '2025-06-02T12:00:00Z',
      },
    },
  })
  @SwaggerResponse({
    status: 204,
    description: 'No Content',
  })
  @SwaggerResponse({
    status: 404,
    description: 'Component not found',
    schema: {
      example: {
        status_code: 404,
        error: 'NOT_FOUND',
        message: 'Component with ID "comp-12345" not found',
        timestamp: '2025-06-02T12:00:00Z',
      },
    },
  })
  @SwaggerResponse({
    status: 409,
    description: 'Component has dependencies',
    schema: {
      example: {
        status_code: 409,
        error: 'HAS_DEPENDENCIES',
        message: 'Cannot delete component with active dependencies',
        dependencies: [
          {
            type: 'component',
            id: 'comp-99999',
            name: 'dependent-service',
          },
        ],
        timestamp: '2025-06-02T12:00:00Z',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async deleteComponent(@Param('id') id: string): Promise<any> {
    try {
      // First check if the component exists
      await this.componentService.getComponent(id);

      // Check for dependencies before deletion
      const dependencies = await this.componentService.checkDependencies(id);
      if (dependencies && dependencies.length > 0) {
        throw {
          status_code: 409,
          error: 'HAS_DEPENDENCIES',
          message: 'Cannot delete component with active dependencies',
          dependencies: dependencies,
          timestamp: new Date().toISOString(),
        };
      }

      // If no dependencies, proceed with deletion
      await this.componentService.deleteComponent(id);

      return {
        status_code: HttpStatus.OK,
        message: 'Component deleted successfully',
        deletedId: id,
        deletedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error.status_code === 409) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        if (error.message.includes('not found')) {
          throw new NotFoundException({
            status_code: 404,
            error: 'NOT_FOUND',
            message: `Component with ID '${id}' not found`,
            timestamp: new Date().toISOString(),
          });
        }
      }
      throw error;
    }
  }

  // Helper method to generate change log between original and updated component
  private generateChangeLog(
    original: ComponentResponseDto,
    updated: ComponentResponseDto,
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

    if (original.componentType !== updated.componentType) {
      changes.push({
        field: 'spec.componentType',
        oldValue: original.componentType,
        newValue: updated.componentType,
      });
    }

    if (original.typeId !== updated.typeId) {
      changes.push({
        field: 'spec.typeId',
        oldValue: original.typeId,
        newValue: updated.typeId,
      });
    }

    if (original.tribe !== updated.tribe) {
      changes.push({
        field: 'spec.tribe',
        oldValue: original.tribe,
        newValue: updated.tribe,
      });
    }

    if (original.squad !== updated.squad) {
      changes.push({
        field: 'spec.squad',
        oldValue: original.squad,
        newValue: updated.squad,
      });
    }

    // Compare dependencies
    if (
      JSON.stringify(original.dependsOn) !== JSON.stringify(updated.dependsOn)
    ) {
      changes.push({
        field: 'spec.dependsOn',
        oldValue: original.dependsOn,
        newValue: updated.dependsOn,
      });
    }

    // Compare links
    if (JSON.stringify(original.links) !== JSON.stringify(updated.links)) {
      changes.push({
        field: 'spec.links',
        oldValue: `${original.links?.length || 0} links`,
        newValue: `${updated.links?.length || 0} links`,
      });
    }

    // Compare labels
    if (JSON.stringify(original.labels) !== JSON.stringify(updated.labels)) {
      changes.push({
        field: 'spec.labels',
        oldValue: original.labels,
        newValue: updated.labels,
      });
    }

    return changes;
  }
}
