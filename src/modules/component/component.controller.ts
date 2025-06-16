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
  // BadRequestException, // No longer explicitly thrown for not found cases
  ConflictException, // For handling 409 directly if needed, though service handles it
} from '@nestjs/common';
import { ComponentService } from './component.service';
// import { ApiResponse } from '../../common/dto/api-response.dto'; // Assuming interceptor handles this
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
    // Service now throws NotFoundException directly
    return await this.componentService.getComponent(id);
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
    // Service now throws NotFoundException directly
    return await this.componentService.getComponentByName(name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all components' })
  @SwaggerResponse({
    status: 200,
    description: 'Components fetched successfully',
    // Assuming an interceptor will wrap this with ApiResponse
    type: [ComponentResponseDto],
  })
  async getAllComponents(): Promise<ComponentResponseDto[]> {
    return await this.componentService.getAllComponents();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) // Ensure 201 is returned on success
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
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async createComponent(
    @Body() createComponentDto: CreateComponentDto,
  ): Promise<any> { // Return type will be ComponentCreateResponse from service now
    // Logic for checking existing component and throwing 409 is moved to service.
    // Service will throw ConflictException.
    // Service returns ComponentCreateResponse, which includes id, metricSources etc.
    // The global HttpExceptionFilter will handle formatting of ConflictException.
    // The TransformInterceptor will format the success response if needed.
    return await this.componentService.createComponent(createComponentDto);
    // Example of how it could be structured by an interceptor:
    // return {
    //   status_code: HttpStatus.CREATED,
    //   message: 'Component created successfully',
    //   data: createdComponentData, // from service
    // };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK) // Ensure 200 is returned on success
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
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async updateComponent(
    @Param('id') id: string,
    @Body() updateComponentDto: UpdateComponentDto,
  ): Promise<any> { // Service returns { component: ComponentResponseDto; changes: ... }
    // Existence check (getComponent) and change log generation are moved to the service.
    // Service will throw NotFoundException if component not found.
    const result = await this.componentService.updateComponent(id, updateComponentDto);
    // The TransformInterceptor can format this into the desired ApiResponse structure.
    return {
      // status_code: HttpStatus.OK, // Handled by @HttpCode or interceptor
      message: 'Component updated successfully',
      id: result.component.id,
      // updatedAt: new Date().toISOString(), // Service DTO could include this
      changes: result.changes,
      data: result.component, // Or spread ...result if that's the desired structure
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK) // Standard for successful DELETE, or 204 if no content returned
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
  async deleteComponent(@Param('id') id: string): Promise<any> {
    // Existence check and dependency check are now handled by the service.
    // Service will throw NotFoundException or ConflictException.
    const result = await this.componentService.deleteComponent(id); // Service returns { id: string; message: string }
    // The TransformInterceptor can format this.
    return {
      // status_code: HttpStatus.OK, // Handled by @HttpCode or interceptor
      message: result.message, // Or a static message like "Component deleted successfully"
      deletedId: result.id,
      // deletedAt: new Date().toISOString(), // Could be part of service response if needed
    };
  }

  // generateChangeLog method is now removed from controller, it's in the service.
}
