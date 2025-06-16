import {
  IsString,
  IsOptional,
  ValidateNested,
  IsArray,
  IsObject,
  IsEnum,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MetadataDto {
  @IsString()
  @ApiProperty({
    example: 'allocation-efficiency',
    description: 'Unique name for the metric',
  })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    example: 'default',
    description: 'Resource namespace',
  })
  namespace?: string;
}

class MetricFormatDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Allocation Efficiency',
    description: 'Unit of measurement',
    required: false,
  })
  unit?: string;
}

class MetricFactDto {
  @IsString()
  @ApiProperty({
    example: 'check-app-toml-resource-request',
    description: 'Unique identifier for the fact',
  })
  id: string;

  @IsString()
  @ApiProperty({
    example: 'Check if CPU requests and memory requests are defined',
    description: 'Human-readable name for the fact',
  })
  name: string;

  @IsString()
  @ApiProperty({
    example: 'extract',
    description: 'Type of fact (extract, aggregate)',
  })
  type: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'github',
    description: 'Source of the fact data',
    required: false,
  })
  source?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'jsonpath',
    description: 'Rule type for processing the fact',
    required: false,
  })
  rule?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '${Metadata.Name}',
    description: 'Repository to extract data from',
    required: false,
  })
  repo?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'app.toml',
    description: 'File path to extract data from',
    required: false,
  })
  filePath?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example:
      '(.service.cpu_requests // .service.production.cpu_requests | . != null)',
    description: 'JSONPath expression to extract data',
    required: false,
  })
  jsonPath?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'and',
    description: 'Aggregation method for aggregate facts',
    required: false,
  })
  method?: string;

  @IsArray()
  @IsOptional()
  @ApiProperty({
    type: [String],
    example: ['check-app-toml-resource-request'],
    description: 'Fact IDs this fact depends on',
    required: false,
  })
  dependsOn?: string[];
}

class MetricSpecDto {
  @IsString()
  @ApiProperty({
    example: 'allocation-efficiency',
    description: 'Display name of the metric',
  })
  name: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example:
      'https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md',
    description: 'Detailed description of the metric',
    required: false,
  })
  description?: string;

  @ValidateNested()
  @Type(() => MetricFormatDto)
  @ApiProperty({ type: MetricFormatDto })
  format: MetricFormatDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MetricFactDto)
  @ApiProperty({
    type: [MetricFactDto],
    description: 'Facts used to evaluate this metric',
    required: false,
  })
  facts?: MetricFactDto[];

  @IsArray()
  @IsOptional()
  @ApiProperty({
    type: [String],
    example: ['service', 'cloud-resource'],
    description: 'Component types this metric applies to',
    required: false,
  })
  componentType?: string[];

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'cost-optimization',
    enum: [
      'resiliency',
      'observability',
      'production-readiness',
      'security',
      'cost-optimization',
    ],
    description: 'Grading system identifier',
    required: false,
  })
  'grading-system'?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: '0 * * * *',
    description: 'Schedule for metric evaluation',
    required: false,
  })
  cronSchedule?: string;
}

export class CreateMetricDto {
  @IsString()
  @ApiProperty({
    example: 'catalog.onefootball.com/v1alpha1',
    description: 'API version for the resource',
  })
  apiVersion: string = 'catalog.onefootball.com/v1alpha1';

  @IsString()
  @ApiProperty({
    example: 'Metric',
    enum: ['Metric'],
    description: 'Resource kind',
  })
  kind: string = 'Metric';

  @ValidateNested()
  @Type(() => MetadataDto)
  @ApiProperty({
    type: MetadataDto,
    description: 'Metadata for the resource',
  })
  metadata: MetadataDto;

  @IsObject()
  @ValidateNested()
  @Type(() => MetricSpecDto)
  @ApiProperty({
    type: MetricSpecDto,
    description: 'Metric specification',
  })
  spec: MetricSpecDto;
}
