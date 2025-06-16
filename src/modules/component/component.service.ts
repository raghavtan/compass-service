import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreateComponentDto,
  UpdateComponentDto,
} from './dto/create-component.dto';
import { ComponentResponseDto } from './dto/component-response.dto';
import { ConfigService } from '@nestjs/config';
import { GraphQLService } from '../../graphql/graphql.service';

interface ComponentResource {
  id: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    resourceVersion?: string;
    generation?: number;
    creationTimestamp?: string;
    deletionTimestamp?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    finalizers?: string[];
  };
  spec: Record<string, any>;
  status?: Record<string, any>;
}

interface MetricSource {
  metricName: string;
  metricId: string;
  metricSourceId: string;
}

interface ComponentCreateResponse extends ComponentResponseDto {
  metricSources?: MetricSource[];
}

interface Dependency {
  type: string;
  id: string;
  name: string;
}

@Injectable()
export class ComponentService {
  private readonly logger = new Logger(ComponentService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly graphqlService: GraphQLService,
  ) {}

  async getAllComponents(): Promise<ComponentResponseDto[]> {
    try {
      const searchQuery = `
      query searchComponents($cloudId: String!, $query: CompassSearchComponentQuery!) {
        compass {
          searchComponents(cloudId: $cloudId, query: $query) {
            ... on CompassSearchComponentConnection {
              nodes {
                component {
                  id
                  name
                  type {
                    name
                    id
                  }
                  description
                  links {
                    name
                    type
                    url
                  }
                  labels
                  relationships {
                    nodes {
                      sourceId
                      targetId
                      type
                    }
                  }
                  customFields {
                    key
                    value
                  }
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      }
      `;

      const variables = {
        cloudId: this.configService.get<string>('compass.cloudId'),
        query: {
          first: 200,
          fieldFilters: { name: 'state', filter: { neq: 'PENDING' } },
        },
      };

      this.logger.debug(`Executing GraphQL query to get all components`);

      const result = await this.graphqlService.executeQuery(
        searchQuery,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.searchComponents ||
        !result.compass.searchComponents.nodes
      ) {
        throw new BadRequestException('Failed to fetch components');
      }

      // Map the components from the search result
      return result.compass.searchComponents.nodes
        .filter((node) => node.component) // Ensure component exists
        .map((node) => this.mapComponentToResponseDto(node.component));
    } catch (error) {
      this.logger.error(
        `Failed to get all components: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to fetch components: ${error.message}`,
      );
    }
  }

  async getComponent(id: string): Promise<ComponentResponseDto> {
    try {
      const query = `
      query getComponent($id: ID!) {
        compass {
          component(id: $id) {
            id
            name
            type {
              name
              id
            }
            description
            links {
              name
              type
              url
            }
            labels
            relationships {
              nodes {
                sourceId
                targetId
                type
              }
            }
            customFields {
              key
              value
            }
            createdAt
            updatedAt
          }
        }
      }
      `;

      const variables = {
        id: id,
      };

      this.logger.debug(
        `Executing GraphQL query to get component by ID: ${id}`,
      );

      const result = await this.graphqlService.executeQuery(query, variables);

      if (!result || !result.compass || !result.compass.component) {
        throw new BadRequestException(`Component with id ${id} not found`);
      }

      return this.mapComponentToResponseDto(result.compass.component);
    } catch (error) {
      this.logger.error(
        `Failed to get component ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to fetch component: ${error.message}`,
      );
    }
  }

  async getComponentByName(name: string): Promise<ComponentResponseDto> {
    try {
      const allComponents = await this.getAllComponents();
      const component = allComponents.find((c) => c.name === name);

      if (!component) {
        throw new BadRequestException(`Component with name ${name} not found`);
      }

      return component;
    } catch (error) {
      this.logger.error(
        `Failed to get component by name ${name}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to fetch component by name: ${error.message}`,
      );
    }
  }

  async createComponent(
    createComponentDto: CreateComponentDto,
  ): Promise<ComponentCreateResponse> {
    try {
      // Handle both direct spec and nested component structure
      const componentSpec =
        createComponentDto.component?.spec || createComponentDto.spec;
      const componentName =
        componentSpec?.name || createComponentDto.component?.metadata?.name;

      if (!componentName) {
        throw new BadRequestException('Component name is required');
      }
      if (!componentSpec) {
        throw new BadRequestException('Component specification is required');
      }

      // Validate typeId
      const validTypeIds = [
        'SERVICE',
        'LIBRARY',
        'WEBSITE',
        'APPLICATION',
        'TEMPLATE',
        'RUNTIME',
      ];
      if (!validTypeIds.includes(componentSpec.typeId)) {
        throw new BadRequestException({
          status_code: 400,
          error: 'VALIDATION_ERROR',
          message: 'Component validation failed',
          details: [
            {
              field: 'spec.typeId',
              error: `Invalid typeId. Must be one of: ${validTypeIds.join(', ')}`,
            },
          ],
        });
      }

      // Check if component with the same name already exists
      try {
        const existingComponent = await this.getComponentByName(componentName);
        if (existingComponent) {
          const error = new BadRequestException(
            `Component with name ${componentName} already exists`,
          );
          error['existingId'] = existingComponent.id;
          throw error;
        }
      } catch (err) {
        // If component not found, that's fine - we'll create it
        if (!err.message.includes('not found')) {
          throw err;
        }
      }

      // Validate dependencies if provided
      if (componentSpec.dependsOn && componentSpec.dependsOn.length > 0) {
        const allComponents = await this.getAllComponents();
        const existingComponentNames = allComponents.map((c) => c.name);

        for (const dependency of componentSpec.dependsOn) {
          if (!existingComponentNames.includes(dependency)) {
            throw new BadRequestException({
              status_code: 400,
              error: 'VALIDATION_ERROR',
              message: 'Component validation failed',
              details: [
                {
                  field: 'spec.dependsOn',
                  error: `Dependency '${dependency}' not found`,
                },
              ],
            });
          }
        }
      }

      // Create component mutation
      const mutation = `
        mutation createComponent($cloudId: ID!, $componentInput: CreateCompassComponentInput!) {
          compass {
            createComponent(cloudId: $cloudId, input: $componentInput) {
              success
              component {
                id
                name
                type {
                  name
                  id
                }
                description
                links {
                  name
                  type
                  url
                }
                labels
                customFields {
                  key
                  value
                }
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
        componentInput: {
          name: componentSpec.name,
          description: componentSpec.description || '',
          typeId: componentSpec.typeId,
          links:
            componentSpec.links?.map((link) => ({
              name: link.name,
              type: link.type,
              url: link.url,
            })) || [],
          labels: componentSpec.labels || [],
          customFields: [
            { key: 'tribe', value: componentSpec.tribe || '' },
            { key: 'squad', value: componentSpec.squad || '' },
            { key: 'componentType', value: componentSpec.componentType || '' },
          ],
        },
      };

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.createComponent ||
        !result.compass.createComponent.success ||
        !result.compass.createComponent.component
      ) {
        const errorMsg =
          result?.compass?.createComponent?.errors?.[0]?.message ||
          'Unknown error';
        throw new BadRequestException(
          `Failed to create component: ${errorMsg}`,
        );
      }

      const createdComponent = result.compass.createComponent.component;
      const componentResponse =
        this.mapComponentToResponseDto(createdComponent);

      // Create relationships for dependencies if provided
      if (componentSpec.dependsOn && componentSpec.dependsOn.length > 0) {
        await this.createDependencyRelationships(
          componentResponse.id,
          componentSpec.dependsOn,
        );
      }

      // Handle metric associations if provided in the request
      const metricSources: MetricSource[] = [];
      if (createComponentDto.metrics && createComponentDto.metrics.length > 0) {
        // Validate metrics exist
        for (const metric of createComponentDto.metrics) {
          try {
            // You would call a metric service here to validate the metric exists
            // For now, we'll assume it's valid and create a mock metric source
            metricSources.push({
              metricName: metric.metricName,
              metricId: metric.metricId,
              metricSourceId: `ms-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            });
          } catch (error) {
            throw new BadRequestException({
              status_code: 422,
              error: 'INVALID_METRICS',
              message: 'One or more metrics are invalid',
              details: [
                {
                  metricName: metric.metricName,
                  metricId: metric.metricId,
                  error: 'Metric not found',
                },
              ],
            });
          }
        }
      }

      return {
        ...componentResponse,
        metricSources,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create component: ${error.message}`,
      );
    }
  }

  async updateComponent(
    id: string,
    updateComponentDto: UpdateComponentDto,
  ): Promise<{ component: ComponentResponseDto }> {
    try {
      // First check if the component exists
      const existingComponent = await this.getComponent(id);

      if (!existingComponent) {
        throw new BadRequestException(`Component with id ${id} not found`);
      }

      const componentSpec = updateComponentDto.spec;
      if (!componentSpec) {
        throw new BadRequestException('Component specification is required');
      }

      // Validate typeId if provided
      if (componentSpec.typeId) {
        const validTypeIds = [
          'SERVICE',
          'LIBRARY',
          'WEBSITE',
          'APPLICATION',
          'TEMPLATE',
          'RUNTIME',
        ];
        if (!validTypeIds.includes(componentSpec.typeId)) {
          throw new BadRequestException({
            status_code: 400,
            error: 'VALIDATION_ERROR',
            message: 'Component update validation failed',
            details: [
              {
                field: 'spec.typeId',
                error: `Invalid typeId. Must be one of: ${validTypeIds.join(', ')}`,
              },
            ],
          });
        }
      }

      // Validate dependencies if provided
      if (componentSpec.dependsOn && componentSpec.dependsOn.length > 0) {
        const allComponents = await this.getAllComponents();
        const existingComponentNames = allComponents.map((c) => c.name);

        for (const dependency of componentSpec.dependsOn) {
          if (!existingComponentNames.includes(dependency)) {
            throw new BadRequestException({
              status_code: 400,
              error: 'VALIDATION_ERROR',
              message: 'Component update validation failed',
              details: [
                {
                  field: 'spec.dependsOn',
                  error: `Dependency '${dependency}' not found`,
                },
              ],
            });
          }
        }
      }

      // Update component mutation
      const mutation = `
        mutation updateComponent($id: ID!, $componentInput: UpdateCompassComponentInput!) {
          compass {
            updateComponent(id: $id, input: $componentInput) {
              success
              component {
                id
                name
                type {
                  name
                  id
                }
                description
                links {
                  name
                  type
                  url
                }
                labels
                customFields {
                  key
                  value
                }
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
        componentInput: {},
      };

      // Only include fields that are being updated
      if (componentSpec.name) {
        variables.componentInput.name = componentSpec.name;
      }

      if (componentSpec.description !== undefined) {
        variables.componentInput.description = componentSpec.description;
      }

      if (componentSpec.typeId) {
        variables.componentInput.typeId = componentSpec.typeId;
      }

      if (componentSpec.links) {
        variables.componentInput.links = componentSpec.links.map((link) => ({
          name: link.name,
          type: link.type,
          url: link.url,
        }));
      }

      if (componentSpec.labels) {
        variables.componentInput.labels = componentSpec.labels;
      }

      // Update custom fields
      const customFields: any = [];
      if (componentSpec.tribe) {
        customFields.push({ key: 'tribe', value: componentSpec.tribe });
      }
      if (componentSpec.squad) {
        customFields.push({ key: 'squad', value: componentSpec.squad });
      }
      if (componentSpec.componentType) {
        customFields.push({
          key: 'componentType',
          value: componentSpec.componentType,
        });
      }
      if (customFields.length > 0) {
        variables.componentInput.customFields = customFields;
      }

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.updateComponent ||
        !result.compass.updateComponent.success ||
        !result.compass.updateComponent.component
      ) {
        const errorMsg =
          result?.compass?.updateComponent?.errors?.[0]?.message ||
          'Unknown error';
        throw new BadRequestException(
          `Failed to update component: ${errorMsg}`,
        );
      }

      const updatedComponent = result.compass.updateComponent.component;

      // Update relationships for dependencies if provided
      if (componentSpec.dependsOn !== undefined) {
        await this.updateDependencyRelationships(id, componentSpec.dependsOn);
      }

      return {
        component: this.mapComponentToResponseDto(updatedComponent),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update component: ${error.message}`,
      );
    }
  }

  async deleteComponent(id: string): Promise<void> {
    try {
      // First check if the component exists
      await this.getComponent(id);

      const mutation = `
        mutation deleteComponent($id: ID!) {
          compass {
            deleteComponent(id: $id) {
              success
              deletedComponentId
              errors {
                message
              }
            }
          }
        }
      `;

      const variables = {
        id: id,
      };

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.deleteComponent ||
        !result.compass.deleteComponent.success
      ) {
        const errorMsg =
          result?.compass?.deleteComponent?.errors?.[0]?.message ||
          'Unknown error';
        throw new BadRequestException(
          `Failed to delete component: ${errorMsg}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete component: ${error.message}`,
      );
    }
  }

  async checkDependencies(id: string): Promise<Dependency[]> {
    try {
      const query = `
        query getComponentDependencies($id: ID!) {
          compass {
            component(id: $id) {
              id
              name
              relationships {
                nodes {
                  sourceId
                  targetId
                  type
                  target {
                    ... on Component {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        id: id,
      };

      const result = await this.graphqlService.executeQuery(query, variables);

      if (!result || !result.compass || !result.compass.component) {
        return [];
      }

      const component = result.compass.component;
      const dependencies: Dependency[] = [];

      // Find components that depend on this component
      if (component.relationships && component.relationships.nodes) {
        for (const relationship of component.relationships.nodes) {
          if (
            relationship.type === 'DEPENDS_ON' &&
            relationship.targetId === id &&
            relationship.target
          ) {
            dependencies.push({
              type: 'component',
              id: relationship.target.id,
              name: relationship.target.name,
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      this.logger.error(
        `Failed to check dependencies for component ${id}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  private async createDependencyRelationships(
    componentId: string,
    dependencies: string[],
  ): Promise<void> {
    try {
      // First, get all components to find the IDs of dependencies
      const allComponents = await this.getAllComponents();
      const componentMap = new Map(allComponents.map((c) => [c.name, c.id]));

      for (const dependencyName of dependencies) {
        const dependencyId = componentMap.get(dependencyName);
        if (dependencyId) {
          const mutation = `
            mutation createRelationship($input: CreateCompassRelationshipInput!) {
              compass {
                createRelationship(input: $input) {
                  success
                  relationship {
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
            input: {
              sourceId: componentId,
              targetId: dependencyId,
              type: 'DEPENDS_ON',
            },
          };

          await this.graphqlService.executeMutation(mutation, variables);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to create dependency relationships: ${error.message}`,
        error.stack,
      );
      // Don't throw here as component creation was successful
    }
  }

  private async updateDependencyRelationships(
    componentId: string,
    newDependencies: string[],
  ): Promise<void> {
    try {
      // Get current relationships
      const currentComponent = await this.getComponent(componentId);
      const currentDependencies = currentComponent.dependsOn || [];

      // Get all components to find IDs
      const allComponents = await this.getAllComponents();
      const componentMap = new Map(allComponents.map((c) => [c.name, c.id]));

      // Find relationships to remove
      const dependenciesToRemove = currentDependencies.filter(
        (dep) => !newDependencies.includes(dep),
      );

      // Find relationships to add
      const dependenciesToAdd = newDependencies.filter(
        (dep) => !currentDependencies.includes(dep),
      );

      // Remove old relationships
      for (const dependencyName of dependenciesToRemove) {
        const dependencyId = componentMap.get(dependencyName);
        if (dependencyId) {
          // First find the relationship ID
          const relationshipQuery = `
            query findRelationship($sourceId: ID!, $targetId: ID!) {
              compass {
                relationships(sourceId: $sourceId, targetId: $targetId, type: "DEPENDS_ON") {
                  nodes {
                    id
                  }
                }
              }
            }
          `;

          const relationshipResult = await this.graphqlService.executeQuery(
            relationshipQuery,
            { sourceId: componentId, targetId: dependencyId },
          );

          if (relationshipResult?.compass?.relationships?.nodes?.length > 0) {
            const relationshipId =
              relationshipResult.compass.relationships.nodes[0].id;

            const deleteMutation = `
              mutation deleteRelationship($id: ID!) {
                compass {
                  deleteRelationship(id: $id) {
                    success
                    errors {
                      message
                    }
                  }
                }
              }
            `;

            await this.graphqlService.executeMutation(deleteMutation, {
              id: relationshipId,
            });
          }
        }
      }

      // Add new relationships
      for (const dependencyName of dependenciesToAdd) {
        const dependencyId = componentMap.get(dependencyName);
        if (dependencyId) {
          const createMutation = `
            mutation createRelationship($input: CreateCompassRelationshipInput!) {
              compass {
                createRelationship(input: $input) {
                  success
                  relationship {
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
            input: {
              sourceId: componentId,
              targetId: dependencyId,
              type: 'DEPENDS_ON',
            },
          };

          await this.graphqlService.executeMutation(createMutation, variables);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to update dependency relationships: ${error.message}`,
        error.stack,
      );
      // Don't throw here as component update was successful
    }
  }

  private mapComponentToResponseDto(component: any): ComponentResponseDto {
    if (!component) {
      throw new BadRequestException('Invalid component data');
    }

    // Extract dependencies from relationships
    const dependsOn =
      component.relationships?.nodes
        ?.filter(
          (rel) => rel.type === 'DEPENDS_ON' && rel.sourceId === component.id,
        )
        .map((rel) => rel.targetId) || [];

    // Find tribe and squad from customFields
    const tribe =
      component.customFields?.find((field) => field.key === 'tribe')?.value ||
      '';
    const squad =
      component.customFields?.find((field) => field.key === 'squad')?.value ||
      '';

    const componentType = component.type?.name?.toLowerCase() || '';

    const links =
      component.links?.map((link) => ({
        name: link.name,
        type: link.type,
        url: link.url,
      })) || [];

    const labels = component.labels || [];

    const baseResponse: ComponentResponseDto = {
      id: component.id,
      name: component.name,
      componentType: componentType,
      typeId: component.type?.id || '',
      description: component.description || '',
      dependsOn: dependsOn,
      tribe: tribe,
      squad: squad,
      links: links,
      labels: labels,
      // Include spec field for API compliance
      spec: {
        name: component.name,
        componentType: componentType,
        typeId: component.type?.id || '',
        description: component.description || '',
        tribe: tribe,
        squad: squad,
        links: links,
        labels: labels,
        dependsOn: dependsOn,
      },
      // Include timestamps if available
      createdAt: component.createdAt,
      updatedAt: component.updatedAt,
    };

    return baseResponse;
  }
}
