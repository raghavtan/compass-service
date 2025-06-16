import { Module } from '@nestjs/common';
import { ComponentController } from './component.controller';
import { ComponentService } from './component.service';
import { GraphQLModule } from '../../graphql/graphql.module';

@Module({
  controllers: [ComponentController],
  providers: [ComponentService],
  exports: [ComponentService],
  imports: [GraphQLModule],
})
export class ComponentModule {}
