import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMetricDto } from './dto/create-metric.dto';
import { UpdateMetricDto } from './dto/update-metric.dto';
import { MetricResponseDto } from './dto/metric-response.dto';
import { ConfigService } from '@nestjs/config';
import { GraphQLService } from '../../graphql/graphql.service';

@Injectable()
export class MetricService {
  constructor(
    private readonly configService: ConfigService,
    private readonly graphqlService: GraphQLService,
  ) {}

  async getAllMetrics(): Promise<MetricResponseDto[]> {
    const query = `
		query searchMetricDefinition($cloudId: ID!) {
			compass {
				metricDefinitions(query: {cloudId: $cloudId, first: 100}) {
					... on CompassMetricDefinitionsConnection {
						nodes{
							id
							name
							type
							description
						}
					}
				}
			}
		}
    `;

    const variables = {
      cloudId: this.configService.get<string>('compass.cloudId'),
    };
    const result = await this.graphqlService.executeQuery(query, variables);
    if (!result || !result.compass || !result.compass.metricDefinitions) {
      throw new BadRequestException('Failed to fetch metric definitions');
    }

    const metricDefinitions = result.compass.metricDefinitions.nodes || [];
    return metricDefinitions.map((metric) =>
      this.mapToMetricResponseDto(metric),
    );
  }

  async getMetric(id: string): Promise<MetricResponseDto> {
    try {
      const result = await this.getAllMetrics();
      if (!result || result.length === 0) {
        throw new BadRequestException(`No metrics fetched from Compass`);
      }
      const metric = result.find((m) => m.id === id);

      if (!metric) {
        throw new BadRequestException(`Metric with id ${id} not found`);
      }
      return metric;
    } catch (error) {
      throw new BadRequestException(`Metric with id ${id} not found ${error}`);
    }
  }

  async getMetricByName(name: string): Promise<MetricResponseDto> {
    try {
      const result = await this.getAllMetrics();
      if (!result || result.length === 0) {
        throw new BadRequestException(`No metrics fetched from Compass`);
      }
      // Find metric by name in the fetched metrics using getMetricByName
      const metric = result.find((m) => m.name === name);

      if (!metric) {
        throw new BadRequestException(`Metric with id ${name} not found`);
      }
      return metric;
    } catch (error) {
      throw new BadRequestException(
        `Metric with id ${name} not found ${error}`,
      );
    }
  }

  async createMetric(
    createMetricDto: CreateMetricDto,
  ): Promise<MetricResponseDto> {
    try {
      if (createMetricDto.kind !== 'Metric') {
        throw new BadRequestException(
          'Invalid resource kind. Expected "Metric"',
        );
      }

      const metricName = createMetricDto.metadata.name;
      if (!metricName) {
        throw new BadRequestException('Metric name is required in metadata');
      }

      const metricSpec = createMetricDto.spec;
      if (!metricSpec) {
        throw new BadRequestException('Metric specification is required');
      }

      try {
        const existingMetric = await this.getMetricByName(metricName);
        if (existingMetric) {
          const error = new BadRequestException(
            `Metric with name ${metricName} already exists`,
          );
          error['existingId'] = existingMetric.id;
          throw error;
        }
      } catch (err) {
        // If metric not found, that's fine - we'll create it
        if (!err.message.includes('not found')) {
          throw err;
        }
      }

      // Validate grading system if present
      if (metricSpec['grading-system']) {
        const validGradingSystems = [
          'resiliency',
          'observability',
          'production-readiness',
          'security',
          'cost-optimization',
        ];
        if (!validGradingSystems.includes(metricSpec['grading-system'])) {
          throw new BadRequestException({
            status_code: 400,
            error: 'VALIDATION_ERROR',
            message: 'Metric validation failed',
            details: [
              {
                field: 'spec.grading-system',
                error:
                  'Invalid grading system. Must be one of: resiliency, observability, production-readiness, security, cost-optimization',
              },
            ],
          });
        }
      }

      // Validate cron schedule if present
      if (metricSpec.cronSchedule) {
        const cronRegex =
          /^(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7})$/;
        if (!cronRegex.test(metricSpec.cronSchedule)) {
          throw new BadRequestException({
            status_code: 400,
            error: 'VALIDATION_ERROR',
            message: 'Metric validation failed',
            details: [
              {
                field: 'spec.cronSchedule',
                error: 'Invalid cron schedule format',
              },
            ],
          });
        }
      }

      const mutation = `
        mutation createMetricDefinition ($cloudId: ID!, $name: String!, $description: String!, $unit: String!) {
          compass {
            createMetricDefinition(
              input: {
                cloudId: $cloudId
                name: $name
                description: $description
                format: {
                  suffix: { suffix: $unit }
                }
              }
            ) {
              success
              createdMetricDefinition {
                id
              }
              errors {
                message
              }
            }
          }
		    }
        `;

      const variables = {
        cloudId: this.configService.get<string>('compass.cloudId'),
        name: createMetricDto.metadata.name,
        description: createMetricDto.spec.description || '',
        unit: createMetricDto.spec.format.unit || '',
      };
      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.createMetricDefinition ||
        !result.compass.createMetricDefinition.createdMetricDefinition
      ) {
        throw new BadRequestException('Failed to create metric definition');
      }

      return this.mapToMetricResponseDto(
        result.compass.createMetricDefinition.createdMetricDefinition,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create metric: ${error.message}`,
      );
    }
  }

  async updateMetric(
    id: string,
    updateMetricDto: UpdateMetricDto,
  ): Promise<any> {
    try {
      // First check if the metric exists
      const existingMetric = await this.getMetric(id);

      if (!existingMetric) {
        throw new BadRequestException(`Metric with id ${id} not found`);
      }

      // Track changes
      const changes: Array<{ field: string; oldValue: any; newValue: any }> =
        [];

      // Prepare update mutation
      const mutation = `
        mutation updateMetricDefinition($cloudId: ID, $id: ID!, $name: String, $description: String, $unit: String!) {
          compass {
            updateMetricDefinition(
              input: {
                cloudId: $cloudId
                id: $id
                name: $name
                description: $description
                format: {
                  suffix: { suffix: $unit }
                }
              }
            ) {
              success
              updatedMetricDefinition {
                id
              }
              errors {
                message
              }
            }
          }
        }
      `;

      const variables: any = {
        id: id,
        cloudId: this.configService.get<string>('compass.cloudId'),
      };

      // Only include fields that are being updated
      if (updateMetricDto.metadata?.name) {
        variables.name = updateMetricDto.metadata.name;

        if (existingMetric.name !== updateMetricDto.metadata.name) {
          changes.push({
            field: 'metadata.name',
            oldValue: existingMetric.name,
            newValue: updateMetricDto.metadata.name,
          });
        }
      }

      if (updateMetricDto.spec?.description) {
        variables.description = updateMetricDto.spec.description;

        if (
          existingMetric.spec?.description !== updateMetricDto.spec.description
        ) {
          changes.push({
            field: 'spec.description',
            oldValue: existingMetric.spec?.description,
            newValue: updateMetricDto.spec.description,
          });
        }
      }

      if (updateMetricDto.spec?.format?.unit) {
        variables.unit = updateMetricDto.spec.format.unit;

        if (existingMetric.unit !== updateMetricDto.spec.format.unit) {
          changes.push({
            field: 'spec.format.unit',
            oldValue: existingMetric.unit,
            newValue: updateMetricDto.spec.format.unit,
          });
        }
      }

      // If we have nothing to update, just return the existing metric
      if (Object.keys(variables).length === 1) {
        // Only has ID
        return {
          metric: existingMetric,
        };
      }

      // Execute the update
      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.updateMetricDefinition ||
        !result.compass.updateMetricDefinition.success ||
        !result.compass.updateMetricDefinition.updatedMetricDefinition
      ) {
        const errors = result?.compass?.updateMetricDefinition?.errors || [];
        const errorMessages = errors.map((e) => e.message).join(', ');
        throw new BadRequestException(
          `Failed to update metric definition: ${errorMessages}`,
        );
      }

      return {
        metric: this.mapToMetricResponseDto(
          result.compass.updateMetricDefinition.updatedMetricDefinition,
        ),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update metric: ${error.message}`,
      );
    }
  }

  async deleteMetric(id: string): Promise<void> {
    try {
      await this.getMetric(id);

      const mutation = `
        mutation deleteMetricDefinition($input: CompassDeleteMetricDefinitionInput!) {
          compass {
            deleteMetricDefinition(input: $input) {
              deletedMetricDefinitionId
              errors {
                message
              }
              success
            }
          }
        }
      `;

      const variables = {
        input: {
          id: id,
        },
      };

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.deleteMetricDefinition ||
        !result.compass.deleteMetricDefinition.success ||
        !result.compass.deleteMetricDefinition.deletedMetricDefinitionId
      ) {
        const errors = result?.compass?.deleteMetricDefinition?.errors || [];
        const errorMessages = errors.map((e) => e.message).join(', ');
        throw new BadRequestException(
          `Failed to delete metric definition: ${errorMessages}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete metric: ${error.message}`,
      );
    }
  }

  // Helper method to map Compass metric definition to our DTO
  private mapToMetricResponseDto(metric: any): MetricResponseDto {
    if (!metric)
      return {
        id: '',
        name: '',
        spec: { name: '', format: { unit: '' } },
      };

    return {
      id: metric.id,
      name: metric.name || '',
      spec: {
        name: metric.name || '',
        description: metric.description || '',
        format: {
          unit: metric.format?.suffix || '',
        },
        // Only include these fields if they exist in the source data
        ...(metric.componentType
          ? { componentType: metric.componentType }
          : {}),
        ...(metric['grading-system']
          ? { 'grading-system': metric['grading-system'] }
          : {}),
        ...(metric.cronSchedule ? { cronSchedule: metric.cronSchedule } : {}),
        ...(metric.facts ? { facts: metric.facts } : {}),
      },
      // Additional fields for internal use
      unit: metric.format?.suffix || '',
      type: metric.type || '',
    };
  }
}
