// component-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

class ComponentLinkResponseDto {
  @ApiProperty({ example: 'Repository' })
  name: string;

  @ApiProperty({
    example: 'REPOSITORY',
    enum: ['REPOSITORY', 'DASHBOARD', 'ON_CALL', 'DOCUMENTATION', 'OTHER'],
  })
  type: string;

  @ApiProperty({ example: 'https://github.com/motain/simple-service' })
  url: string;
}

class ComponentSpecResponseDto {
  @ApiProperty({ example: 'simple-service' })
  name: string;

  @ApiProperty({ example: 'service' })
  componentType: string;

  @ApiProperty({ example: 'SERVICE' })
  typeId: string;

  @ApiProperty({
    example: 'Simple-service is a no-nonsense service',
    required: false,
    nullable: true,
  })
  description?: string;

  @ApiProperty({ example: 'platform' })
  tribe: string;

  @ApiProperty({ example: 'cloud-runtime' })
  squad: string;

  @ApiProperty({
    type: [ComponentLinkResponseDto],
    description: 'Links related to the component',
  })
  links: ComponentLinkResponseDto[];

  @ApiProperty({
    type: [String],
    example: ['platform', 'cloud-runtime'],
    description: 'Labels for the component',
  })
  labels: string[];

  @ApiProperty({
    type: [String],
    example: ['other-service'],
    description: 'Components this component depends on',
    required: false,
    nullable: true,
  })
  dependsOn?: string[];
}

class MetricAssociationResponseDto {
  @ApiProperty({ example: 'allocation-efficiency' })
  metricName: string;

  @ApiProperty({ example: 'metric-67890' })
  metricId: string;

  @ApiProperty({ example: 'ms-11111' })
  metricSourceId: string;
}

export class ComponentResponseDto {
  @ApiProperty({ example: 'comp-12345' })
  id: string;

  @ApiProperty({ example: 'simple-service' })
  name: string;

  @ApiProperty({ required: false, nullable: true, example: 'service' })
  componentType: string;

  @ApiProperty({ required: false, nullable: true, example: 'SERVICE' })
  typeId: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string;

  @ApiProperty({ type: [String], required: false, nullable: true })
  dependsOn?: string[];

  @ApiProperty({ required: false, nullable: true, example: 'platform' })
  tribe: string;

  @ApiProperty({ required: false, nullable: true, example: 'cloud-runtime' })
  squad: string;

  @ApiProperty({
    type: [ComponentLinkResponseDto],
    required: false,
    nullable: true,
  })
  links: ComponentLinkResponseDto[];

  @ApiProperty({ type: [String], required: false, nullable: true })
  labels: string[];

  @ApiProperty({
    type: ComponentSpecResponseDto,
    description: 'Component specification details',
    required: false,
  })
  spec?: ComponentSpecResponseDto;

  @ApiProperty({
    type: [MetricAssociationResponseDto],
    description: 'Metrics associated with this component',
    required: false,
  })
  metricAssociation?: MetricAssociationResponseDto[];

  @ApiProperty({
    example: '2025-06-02T10:00:00Z',
    description: 'Component creation timestamp',
    required: false,
  })
  createdAt?: string;

  @ApiProperty({
    example: '2025-06-02T10:00:00Z',
    description: 'Component last update timestamp',
    required: false,
  })
  updatedAt?: string;
}

// For create/update responses
export class ComponentCreateResponseDto {
  @ApiProperty({ example: 201 })
  status_code: number;

  @ApiProperty({ example: 'comp-12345' })
  id: string;

  @ApiProperty({ example: 'Component created successfully' })
  message: string;

  @ApiProperty({
    type: [MetricAssociationResponseDto],
    description: 'Metric sources created for this component',
    required: false,
  })
  metricSources?: MetricAssociationResponseDto[];

  @ApiProperty({ example: '2025-06-02T10:00:00Z' })
  createdAt: string;
}

export class ComponentUpdateResponseDto {
  @ApiProperty({ example: 200 })
  status_code: number;

  @ApiProperty({ example: 'comp-12345' })
  id: string;

  @ApiProperty({ example: 'Component updated successfully' })
  message: string;

  @ApiProperty({ example: '2025-06-02T11:00:00Z' })
  updatedAt: string;

  @ApiProperty({
    type: Array,
    description: 'List of changes made to the component',
    required: false,
  })
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}

export class ComponentDeleteResponseDto {
  @ApiProperty({ example: 200 })
  status_code: number;

  @ApiProperty({ example: 'Component deleted successfully' })
  message: string;

  @ApiProperty({ example: 'comp-12345' })
  deletedId: string;

  @ApiProperty({ example: '2025-06-02T12:00:00Z' })
  deletedAt: string;
}

// Error response DTOs
export class ValidationErrorDetailDto {
  @ApiProperty({ example: 'spec.typeId' })
  field: string;

  @ApiProperty({
    example:
      'Invalid typeId. Must be one of: SERVICE, LIBRARY, WEBSITE, APPLICATION, TEMPLATE, RUNTIME',
  })
  error: string;
}

export class ComponentErrorResponseDto {
  @ApiProperty({ example: 400 })
  status_code: number;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  error: string;

  @ApiProperty({ example: 'Component validation failed' })
  message: string;

  @ApiProperty({ type: [ValidationErrorDetailDto], required: false })
  details?: ValidationErrorDetailDto[];

  @ApiProperty({ example: '2025-06-02T10:00:00Z' })
  timestamp: string;

  @ApiProperty({ example: 'req-12345-67890', required: false })
  requestId?: string;
}

export class ComponentConflictErrorDto extends ComponentErrorResponseDto {
  @ApiProperty({ example: 'comp-54321', required: false })
  existingId?: string;
}

export class DependencyDto {
  @ApiProperty({ example: 'component' })
  type: string;

  @ApiProperty({ example: 'comp-99999' })
  id: string;

  @ApiProperty({ example: 'dependent-service' })
  name: string;
}

export class ComponentDependencyErrorDto extends ComponentErrorResponseDto {
  @ApiProperty({ type: [DependencyDto], required: false })
  dependencies?: DependencyDto[];
}
