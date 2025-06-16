import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ComponentModule } from './modules/component/component.module';
import { MetricModule } from './modules/metric/metric.module';
import { ScorecardModule } from './modules/scorecard/scorecard.module';
import { HealthModule } from './modules/health/health.module';
import { GraphQLModule } from './graphql/graphql.module';

@Module({
  imports: [
    ComponentModule,
    MetricModule,
    ScorecardModule,
    HealthModule,
    GraphQLModule,
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
