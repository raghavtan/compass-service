import {
  BadRequestException,
  ConflictException,
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
    // Current implementation fetches all metrics. This is kept as per plan if direct GQL query is hard.
    const allMetrics = await this.getAllMetrics(); // This might throw BadRequestException if fetch fails
    if (!allMetrics) { // Should not happen if getAllMetrics throws, but as a safeguard
      throw new NotFoundException(`Metrics data could not be retrieved.`);
    }
    const metric = allMetrics.find((m) => m.id === id);

    if (!metric) {
      throw new NotFoundException(`Metric with ID '${id}' not found.`);
    }
    return metric;
  }

  async getMetricByName(name: string): Promise<MetricResponseDto> {
    // Current implementation fetches all metrics.
    const allMetrics = await this.getAllMetrics();
    if (!allMetrics) {
      throw new NotFoundException(`Metrics data could not be retrieved.`);
    }
    const metric = allMetrics.find((m) => m.name === name);

    if (!metric) {
      throw new NotFoundException(`Metric with name '${name}' not found.`);
    }
    return metric;
  }

  async createMetric(
    createMetricDto: CreateMetricDto,
  ): Promise<MetricResponseDto> {
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
      // If getMetricByName succeeds, it means a metric with this name exists.
      throw new ConflictException(
        `Metric with name '${metricName}' already exists. Existing ID: ${existingMetric.id}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        // This is the expected case: metric does not exist, so we can proceed.
      } else if (error instanceof ConflictException) {
        throw error; // Re-throw the conflict exception
      } else {
        // Any other error during the check should be logged and re-thrown
        this.graphqlService.getLogger().error( // Assuming GraphQLService has a logger or use general logger
          `Unexpected error while checking for existing metric '${metricName}': ${error.message}`,
          error.stack,
        );
        throw error;
      }
    }

    try {
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
  ): Promise<{ metric: MetricResponseDto; changes: Array<{ field: string; oldValue: any; newValue: any }> }> {
    // First check if the metric exists. getMetric will throw NotFoundException if not found.
    const existingMetric = await this.getMetric(id);

    // Track changes
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Prepare update mutation
    // Ensure all fields of MetricResponseDto are potentially updatable or fetched for change log
    try {
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

      // If we have nothing to update based on DTO, just return the existing metric and no changes
      if (Object.keys(variables).length <= 2 && !variables.name && !variables.description && !variables.unit) {
        // Only id and cloudId might be present
        return {
          metric: existingMetric,
          changes: changes, // Should be empty
        };
      }

      const result = await this.graphqlService.executeMutation(mutation, variables);

      if (
        !result?.compass?.updateMetricDefinition?.success ||
        !result.compass.updateMetricDefinition.updatedMetricDefinition
      ) {
        const errorMsg = result?.compass?.updateMetricDefinition?.errors?.[0]?.message || 'Unknown error during metric update';
        throw new BadRequestException(`Failed to update metric definition: ${errorMsg}`);
      }

      const updatedMetricDto = this.mapToMetricResponseDto(
         result.compass.updateMetricDefinition.updatedMetricDefinition
      );

      // Recalculate changes against the *actually updated* DTO if fields were missing in initial DTO
      // This is simplified here; a more robust way is to ensure `existingMetric` and `updatedMetricDto`
      // are perfectly aligned in terms of fields for comparison by `generateChangeLog` pattern.
      // For now, the `changes` array populated during variable assignment is used.
      // A better way: fetch the metric anew after update if GQL response is minimal.

      return {
        metric: updatedMetricDto,
        changes: changes, // Return the tracked changes
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.graphqlService.getLogger().error(`Failed to update metric ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update metric: ${error.message}`);
    }
  }

  async deleteMetric(id: string): Promise<{ id: string; message: string }> {
    // First, check if the metric exists. getMetric will throw NotFoundException if not.
    await this.getMetric(id);

    // Dependency check is NOT implemented here due to complexity of identifying GQL query.
    // Placeholder for where it would go:
    // const isInUse = await this.checkIfMetricIsInUse(id);
    // if (isInUse) {
    //   throw new ConflictException(`Metric with ID '${id}' is in use and cannot be deleted.`);
    // }

    try {
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
        !result?.compass?.deleteMetricDefinition?.success ||
        !result.compass.deleteMetricDefinition.deletedMetricDefinitionId
      ) {
        const errorMsg = result?.compass?.deleteMetricDefinition?.errors?.[0]?.message || 'Unknown error during metric deletion';
        // Check if error message indicates it's in use (this is a basic heuristic)
        if (errorMsg.toLowerCase().includes('referenced by') || errorMsg.toLowerCase().includes('in use')) {
          throw new ConflictException(`Failed to delete metric definition: ${errorMsg}. It may be in use.`);
        }
        throw new BadRequestException(`Failed to delete metric definition: ${errorMsg}`);
      }
      return { id, message: `Metric with ID '${id}' deleted successfully.` };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.graphqlService.getLogger().error(`Failed to delete metric ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete metric: ${error.message}`);
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
