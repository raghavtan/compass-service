import { PartialType } from '@nestjs/mapped-types';
import { CreateMetricDto } from './create-metric.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMetricDto extends PartialType(CreateMetricDto) {
  @ApiProperty({
    example: 'Metric',
    enum: ['Metric'],
    description: 'Resource kind',
    required: true,
  })
  kind: string = 'Metric';

  @ApiProperty({
    example: 'catalog.onefootball.com/v1alpha1',
    description: 'API version',
    required: true,
  })
  apiVersion: string = 'catalog.onefootball.com/v1alpha1';
}
