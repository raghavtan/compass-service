import { ApiProperty } from '@nestjs/swagger';

class MetricFact {
  @ApiProperty({ example: 'check-app-toml-resource-request' })
  id: string;

  @ApiProperty({
    example: 'Check if CPU requests and memory requests are defined',
  })
  name: string;

  @ApiProperty({ example: 'extract' })
  type: string;

  @ApiProperty({ example: 'github' })
  source: string;

  @ApiProperty({ example: 'jsonpath' })
  rule: string;

  @ApiProperty({ example: '${Metadata.Name}', required: false })
  repo?: string;

  @ApiProperty({ example: 'app.toml', required: false })
  filePath?: string;

  @ApiProperty({
    example:
      '(.service.cpu_requests // .service.production.cpu_requests | . != null)',
    required: false,
  })
  jsonPath?: string;
}

class MetricFormat {
  @ApiProperty({ example: 'Allocation Efficiency' })
  unit: string;
}

class MetricSpec {
  @ApiProperty({ example: 'allocation-efficiency' })
  name: string;

  @ApiProperty({
    example:
      'https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md',
    required: false,
  })
  description?: string;

  @ApiProperty({ type: MetricFormat })
  format: MetricFormat;

  @ApiProperty({ type: [MetricFact], required: false })
  facts?: MetricFact[];

  @ApiProperty({
    type: [String],
    example: ['service', 'cloud-resource'],
    required: false,
  })
  componentType?: string[];

  @ApiProperty({
    example: 'cost-optimization',
    required: false,
  })
  'grading-system'?: string;

  @ApiProperty({
    example: '0 * * * *',
    required: false,
  })
  cronSchedule?: string;
}

export class MetricResponseDto {
  @ApiProperty({ example: 'metric-67890' })
  id: string;

  @ApiProperty({ example: 'allocation-efficiency' })
  name: string;

  @ApiProperty({ type: MetricSpec })
  spec: MetricSpec;

  // Fields below are for internal use and may not be part of the API response
  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  type?: string;
}

// For error responses
export class ErrorDetailDto {
  @ApiProperty({ example: 'spec.grading-system' })
  field: string;

  @ApiProperty({ example: 'Invalid grading system' })
  error: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  status_code: number;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  error: string;

  @ApiProperty({ example: 'Metric validation failed' })
  message: string;

  @ApiProperty({ type: [ErrorDetailDto], required: false })
  details?: ErrorDetailDto[];

  @ApiProperty({ example: 'req-12345-67890', required: false })
  requestId?: string;
}

export class ResourceReferenceDto {
  @ApiProperty({ example: 'component' })
  type: string;

  @ApiProperty({ example: 'comp-456' })
  id: string;

  @ApiProperty({ example: 'simple-service' })
  name: string;
}

export class ConflictErrorDto extends ErrorResponseDto {
  @ApiProperty({ type: [ResourceReferenceDto], required: false })
  usedBy?: ResourceReferenceDto[];

  @ApiProperty({ example: 'metric-54321', required: false })
  existingId?: string;
}

export class CreateMetricResponseDto {
  @ApiProperty({ example: 201 })
  status_code: number;

  @ApiProperty({ example: 'metric-67890' })
  id: string;

  @ApiProperty({ example: 'Metric created successfully' })
  message: string;
}

export class UpdateMetricResponseDto {
  @ApiProperty({ example: 200 })
  status_code: number;

  @ApiProperty({ example: 'metric-67890' })
  id: string;

  @ApiProperty({ example: 'Metric updated successfully' })
  message: string;

  @ApiProperty({ type: Array, required: false })
  changes?: any[];
}

export class DeleteMetricResponseDto {
  @ApiProperty({ example: 200 })
  status_code: number;

  @ApiProperty({ example: 'Metric deleted successfully' })
  message: string;

  @ApiProperty({ example: 'metric-67890' })
  deletedId: string;

}
