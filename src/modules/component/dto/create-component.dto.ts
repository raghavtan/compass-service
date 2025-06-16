// create-component.dto.ts
import { IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { RequestPayloadDto } from '../../../common/dto/request-payload.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ComponentLinkDto {
  @IsString()
  @ApiProperty({
    example: 'Repository',
    description: 'Name of the link',
  })
  name: string;

  @IsString()
  @ApiProperty({
    example: 'REPOSITORY',
    description: 'Type of the link',
    enum: ['REPOSITORY', 'DASHBOARD', 'ON_CALL', 'DOCUMENTATION', 'OTHER'],
  })
  type: string;

  @IsString()
  @ApiProperty({
    example: 'https://github.com/motain/simple-service',
    description: 'URL of the link',
  })
  url: string;
}

class ComponentSpecDto {
  @IsString()
  @ApiProperty({
    example: 'simple-service',
    description: 'Name of the component',
  })
  name: string;

  @IsString()
  @ApiProperty({
    example: 'service',
    description: 'Type of the component',
  })
  componentType: string;

  @IsString()
  @ApiProperty({
    example: 'SERVICE',
    description: 'Type ID of the component',
    enum: [
      'SERVICE',
      'LIBRARY',
      'WEBSITE',
      'APPLICATION',
      'TEMPLATE',
      'RUNTIME',
    ],
  })
  typeId: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example:
      'Simple-service is a no-nonsense, do-what-it-needs-to-do kind of service.',
    description: 'Description of the component',
    required: false,
  })
  description?: string;

  @IsArray()
  @IsOptional()
  @ApiProperty({
    type: [String],
    example: ['other-service'],
    description: 'Components this component depends on',
    required: false,
  })
  dependsOn?: string[];

  @IsString()
  @ApiProperty({
    example: 'platform',
    description: 'Tribe of the component',
  })
  tribe: string;

  @IsString()
  @ApiProperty({
    example: 'cloud-runtime',
    description: 'Squad of the component',
  })
  squad: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentLinkDto)
  @ApiProperty({
    type: [ComponentLinkDto],
    description: 'Links related to the component',
  })
  links: ComponentLinkDto[];

  @IsArray()
  @ApiProperty({
    type: [String],
    example: ['platform', 'cloud-runtime'],
    description: 'Labels for the component',
  })
  labels: string[];
}

class MetricAssociationDto {
  @IsString()
  @ApiProperty({
    example: 'allocation-efficiency',
    description: 'Name of the metric to associate',
  })
  metricName: string;

  @IsString()
  @ApiProperty({
    example: 'metric-67890',
    description: 'ID of the metric to associate',
  })
  metricId: string;
}

class ComponentDto {
  @ValidateNested()
  @Type(() => RequestPayloadDto)
  @ApiProperty({
    description: 'Component metadata',
    example: { name: 'simple-service' },
  })
  metadata: { name: string };

  @ValidateNested()
  @Type(() => ComponentSpecDto)
  @ApiProperty({ type: ComponentSpecDto })
  spec: ComponentSpecDto;
}

export class CreateComponentDto {
  @ApiProperty({ example: 'Component', enum: ['Component'] })
  kind: string = 'Component';

  @ApiProperty({ example: 'catalog.onefootball.com/v1alpha1' })
  apiVersion: string = 'catalog.onefootball.com/v1alpha1';

  @ValidateNested()
  @Type(() => ComponentDto)
  @ApiProperty({ type: ComponentDto })
  component: ComponentDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MetricAssociationDto)
  @ApiProperty({
    type: [MetricAssociationDto],
    description: 'Metrics to associate with this component',
    required: false,
  })
  metrics?: MetricAssociationDto[];

  // For backward compatibility, also support direct spec access
  @ValidateNested()
  @Type(() => ComponentSpecDto)
  @ApiProperty({ type: ComponentSpecDto })
  spec: ComponentSpecDto = {} as ComponentSpecDto;
}

export class UpdateComponentDto extends PartialType(CreateComponentDto) {
  @ValidateNested()
  @Type(() => RequestPayloadDto)
  @ApiProperty({
    description: 'Component metadata',
    example: { name: 'simple-service' },
    required: false,
  })
  metadata?: { name: string };
}
