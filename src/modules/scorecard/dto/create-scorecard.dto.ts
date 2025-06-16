import {
  IsString,
  IsOptional,
  ValidateNested,
  IsArray,
  IsEnum,
  IsNumber,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { RequestPayloadDto } from '../../../common/dto/request-payload.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum ScoringStrategyType {
  WEIGHT_BASED = 'WEIGHT_BASED',
}

enum Importance {
  REQUIRED = 'REQUIRED',
  OPTIONAL = 'OPTIONAL',
  RECOMMENDED = 'RECOMMENDED',
}

enum State {
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
}

enum Comparator {
  EQUALS = 'EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_THAN_OR_EQUALS = 'GREATER_THAN_OR_EQUALS',
  LESS_THAN_OR_EQUALS = 'LESS_THAN_OR_EQUALS',
}

class HasMetricValueDto {

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'metric-67890',
    description: 'Metric criteria ID to check specific to scorecard',
    required: false,
  })
  id?: string;

  @IsEnum(Comparator)
  @ApiProperty({
    example: 'EQUALS',
    enum: Comparator,
    description: 'Comparator type',
  })
  comparator: Comparator;

  @IsNumber()
  @ApiProperty({
    example: 1,
    description: 'Value to compare against',
  })
  comparatorValue: number;

  @IsString()
  @ApiProperty({
    example: 'allocation-efficiency',
    description: 'Metric name to check',
  })
  metricName: string;

  @IsString()
  @ApiProperty({
    example: 'allocation-efficiency',
    description: 'Name of the criteria',
  })
  name: string;

  @IsNumber()
  @ApiProperty({
    example: 100,
    description: 'Weight of this criteria',
  })
  weight: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'metric-67890',
    description: 'Metric definition ID to check against',
    required: false,
  })
  metricDefinitionId?: string;
}

class CriteriaDto {
  @ValidateNested()
  @Type(() => HasMetricValueDto)
  @ApiProperty({ type: HasMetricValueDto })
  hasMetricValue: HasMetricValueDto;
}

class ScorecardSpecDto {
  @IsArray()
  @ArrayMinSize(1)
  @ApiProperty({
    type: [String],
    example: ['SERVICE'],
    description: 'Component types this scorecard applies to',
  })
  componentTypeIds: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriteriaDto)
  @ArrayMinSize(1)
  @ApiProperty({
    type: [CriteriaDto],
    description: 'Criteria used to evaluate this scorecard',
  })
  criteria: CriteriaDto[];

  @IsString()
  @IsOptional()
  @ApiProperty({
    example:
      'https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md',
    description: 'Detailed description of the scorecard',
    required: false,
  })
  description?: string;

  @IsEnum(Importance)
  @ApiProperty({
    example: 'REQUIRED',
    enum: Importance,
    description: 'Importance of the scorecard',
  })
  importance: Importance;

  @IsString()
  @MinLength(1)
  @ApiProperty({
    example: 'cost-optimization',
    description: 'Name of the scorecard',
  })
  name: string;

  @IsString()
  @ApiProperty({
    example: '712020:edcf2690-1f3e-4310-9eb8-1ecef88d64b6',
    description: 'Owner ID of the scorecard',
  })
  ownerId: string;

  @IsEnum(ScoringStrategyType)
  @ApiProperty({
    example: 'WEIGHT_BASED',
    enum: ScoringStrategyType,
    description: 'Scoring strategy type',
  })
  scoringStrategyType: ScoringStrategyType;

  @IsEnum(State)
  @ApiProperty({
    example: 'PUBLISHED',
    enum: State,
    description: 'State of the scorecard',
  })
  state: State;
}

export class CreateScorecardDto extends RequestPayloadDto {
  @ApiProperty({ example: 'Scorecard', enum: ['Scorecard'] })
  kind: string = 'Scorecard';

  @ApiProperty({ example: 'catalog.onefootball.com/v1alpha1' })
  apiVersion: string = 'catalog.onefootball.com/v1alpha1';

  @ValidateNested()
  @Type(() => ScorecardSpecDto)
  @ApiProperty({ type: ScorecardSpecDto })
  spec: ScorecardSpecDto = {} as ScorecardSpecDto;
}

export class UpdateScorecardDto extends PartialType(CreateScorecardDto) {}
