import { Module } from '@nestjs/common';
import { ScorecardController } from './scorecard.controller';
import { ScorecardService } from './scorecard.service';
import { GraphQLModule } from '../../graphql/graphql.module';
import { MetricModule } from '../metric/metric.module';

@Module({
  controllers: [ScorecardController],
  providers: [ScorecardService],
  exports: [ScorecardService],
  imports: [GraphQLModule, MetricModule],
})
export class ScorecardModule {}
