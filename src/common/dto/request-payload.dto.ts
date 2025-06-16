import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MetadataDto {
  @IsString()
  @ApiProperty({
    example: 'security-as-pipeline',
    description: 'Unique name for the resource',
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

export class RequestPayloadDto {
  @IsString()
  @ApiProperty({
    example: 'catalog.onefootball.com/v1alpha1',
    description: 'API version for the resource',
  })
  apiVersion: string;

  @IsString()
  @ApiProperty({
    example: 'Metric',
    description: 'Resource kind',
  })
  kind: string;

  @ValidateNested()
  @Type(() => MetadataDto)
  @ApiProperty({ type: MetadataDto })
  metadata: MetadataDto;

  @IsObject()
  @ApiProperty({
    description: 'Resource specification',
    type: Object,
  })
  spec: Record<string, any>;
}
