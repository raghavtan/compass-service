import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';

export class CriteriaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  metricDefinitionId: string;

  @ApiProperty()
  weight: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  metricName: string;

}

class OwnerResponseDto {
  @ApiProperty()
  name: string;
}

export class ScorecardResponseDto {
  @ApiProperty({ example: 'scorecard-123' })
  id: string;

  @ApiProperty({ example: 'cost-optimization' })
  name: string;

  @ApiProperty({
    example: 'PUBLISHED',
    enum: ['PUBLISHED', 'DRAFT'],
  })
  state: string;

  @ApiProperty({ required: false })
  type?: string;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({
    required: false,
    example:
      'https://github.com/motain/of-catalog/blob/main/docs/grading-system/cost-optimization.md',
  })
  description?: string;

  @ApiProperty({ type: [CriteriaResponseDto] })
  criterias: CriteriaResponseDto[];

  @ApiProperty({
    type: [String],
    example: ['SERVICE', 'LIBRARY'],
  })
  componentTypeIds: string[];

  @ApiProperty({ type: OwnerResponseDto })
  owner: OwnerResponseDto;

}
