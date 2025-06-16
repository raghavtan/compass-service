import { Module } from '@nestjs/common';
import { MetricController } from './metric.controller';
import { MetricService } from './metric.service';
import { GraphQLModule } from '../../graphql/graphql.module';

@Module({
  controllers: [MetricController],
  providers: [MetricService],
  exports: [MetricService],
  imports: [GraphQLModule],
})
export class MetricModule {}
