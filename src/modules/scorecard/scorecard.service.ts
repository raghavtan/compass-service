import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateScorecardDto } from './dto/create-scorecard.dto';
import {
  ScorecardResponseDto,
  CriteriaResponseDto,
} from './dto/scorecard-response.dto';
import { ConfigService } from '@nestjs/config';
import { GraphQLService } from '../../graphql/graphql.service';
import { MetricService } from '../metric/metric.service';
import any = jasmine.any;

@Injectable()
export class ScorecardService {
  private metricsCache: MetricResponseDto[] = null;
  private scorecardListCache: ScorecardResponseDto[] = null; // Cache for scorecards themselves

  constructor(
    private readonly configService: ConfigService,
    private readonly graphqlService: GraphQLService,
    private readonly metricService: MetricService,
  ) {}

  // Helper to get (and cache) metrics
  private async getMetrics(): Promise<MetricResponseDto[]> {
    if (this.metricsCache === null) {
      this.metricsCache = await this.metricService.getAllMetrics();
      if (!this.metricsCache) { // Should not happen if getAllMetrics throws, but good practice
        this.graphqlService.getLogger().warn('Metric service returned null or undefined for getAllMetrics.');
        this.metricsCache = []; // Prevent repeated calls if service behaves unexpectedly
      }
    }
    return this.metricsCache;
  }

  // Method to clear caches if data becomes stale, e.g., after create/update/delete
  private clearCaches(): void {
    this.metricsCache = null;
    this.scorecardListCache = null;
  }

  // Helper method to generate change log (moved from controller)
  public generateChangeLog(
    original: ScorecardResponseDto,
    updated: CreateScorecardDto | ScorecardResponseDto, // DTO for updated might be different
  ): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    const updatedSpec = 'spec' in updated ? updated.spec : updated; // Handle both DTO types
    const originalSpec = original.spec || original;


    if (originalSpec.name !== updatedSpec.name) {
      changes.push({
        field: 'spec.name',
        oldValue: originalSpec.name,
        newValue: updatedSpec.name,
      });
    }
    if (originalSpec.description !== updatedSpec.description) {
      changes.push({
        field: 'spec.description',
        oldValue: originalSpec.description,
        newValue: updatedSpec.description,
      });
    }
    if (JSON.stringify(originalSpec.componentTypeIds) !== JSON.stringify(updatedSpec.componentTypeIds)) {
      changes.push({
        field: 'spec.componentTypeIds',
        oldValue: originalSpec.componentTypeIds,
        newValue: updatedSpec.componentTypeIds,
      });
    }
    // Simplified criteria comparison for brevity, real one might be more detailed
    if (JSON.stringify(originalSpec.criterias) !== JSON.stringify(updatedSpec.criteria || updatedSpec.criterias)) {
       changes.push({
        field: 'spec.criteria',
        oldValue: `${originalSpec.criterias?.length || 0} criteria`,
        newValue: `${(updatedSpec.criteria || updatedSpec.criterias)?.length || 0} criteria`,
      });
    }
    // Add other fields as necessary: ownerId, state, importance, scoringStrategyType
    if (originalSpec.ownerId !== updatedSpec.ownerId && updatedSpec.ownerId !== undefined) {
        changes.push({ field: 'spec.ownerId', oldValue: originalSpec.ownerId, newValue: updatedSpec.ownerId });
    }
    if (originalSpec.state !== updatedSpec.state && updatedSpec.state !== undefined) {
        changes.push({ field: 'spec.state', oldValue: originalSpec.state, newValue: updatedSpec.state });
    }
     if (originalSpec.importance !== updatedSpec.importance && updatedSpec.importance !== undefined) {
        changes.push({ field: 'spec.importance', oldValue: originalSpec.importance, newValue: updatedSpec.importance });
    }
    if (originalSpec.scoringStrategyType !== updatedSpec.scoringStrategyType && updatedSpec.scoringStrategyType !== undefined) {
        changes.push({ field: 'spec.scoringStrategyType', oldValue: originalSpec.scoringStrategyType, newValue: updatedSpec.scoringStrategyType });
    }

    return changes;
  }


  async getAllScorecards(bustCache: boolean = false): Promise<ScorecardResponseDto[]> {
    if (this.scorecardListCache !== null && !bustCache) {
      return this.scorecardListCache;
    }

    const query = `
    query searchScorecards($cloudId: ID!) {
      compass {
        scorecards(cloudId: $cloudId, query: { first: 100 }) {
          ... on CompassScorecardConnection {
            nodes {
              id
              name
              state
              type @optIn(to: "compass-beta")
              verified
              description
              criterias {
                id
                weight
                name
              }
              componentTypeIds
              owner {
                name
              }
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
    if (!result?.compass?.scorecards?.nodes) {
      this.graphqlService.getLogger().error('Failed to fetch scorecards or malformed response from GraphQL query.', { query, variables, result });
      throw new BadRequestException('Failed to fetch scorecards data.');
    }

    const metricsList = await this.getMetrics(); // Use cached metrics
    if (!metricsList) { // Should not happen if getMetrics is robust
        this.graphqlService.getLogger().error('Metrics list is unexpectedly null/undefined in getAllScorecards.');
        throw new BadRequestException('Failed to retrieve metrics for scorecards association.');
    }

    const rawScorecards = result.compass.scorecards.nodes;
    // Map metricDefinitionId to criteria
    for (const scorecard of rawScorecards) {
      if (scorecard.criterias && scorecard.criterias.length > 0) {
        for (const criteria of scorecard.criterias) {
          // Assuming criteria.name from scorecard GQL maps to metric name
          const metric = metricsList.find((m) => m.name === criteria.name);
          if (metric) {
            criteria.metricDefinitionId = metric.id;
          } else {
             this.graphqlService.getLogger().warn(`No metric found for criteria name '${criteria.name}' in scorecard '${scorecard.name}'.`);
          }
        }
      }
    }
    // TODO: Transform rawScorecards to ScorecardResponseDto if needed, or ensure GQL returns compatible structure.
    // For now, assume direct compatibility or that mapToScorecardResponseDto handles it if such a helper exists.
    this.scorecardListCache = rawScorecards.map(sc => this.mapToScorecardResponseDto(sc, metricsList));
    return this.scorecardListCache;
  }

  async getScorecard(id: string): Promise<ScorecardResponseDto> {
    const allScorecards = await this.getAllScorecards(); // Uses cache
    const scorecard = allScorecards.find((s) => s.id === id);
    if (!scorecard) {
      throw new NotFoundException(`Scorecard with ID '${id}' not found.`);
    }
    return scorecard;
  }

  async getScorecardByName(name: string): Promise<ScorecardResponseDto> {
    const allScorecards = await this.getAllScorecards(); // Uses cache
    const scorecard = allScorecards.find((s) => s.name === name);
    if (!scorecard) {
      throw new NotFoundException(`Scorecard with name '${name}' not found.`);
    }
    return scorecard;
  }

  async updateScorecard(
    id: string,
    updateScorecardDto: CreateScorecardDto,
  ): Promise<{ scorecard: ScorecardResponseDto; changes: Array<{ field: string; oldValue: any; newValue: any }> }> {
    const existingScorecard = await this.getScorecard(id); // Handles NotFoundException

    if (updateScorecardDto.kind !== 'Scorecard') {
      throw new BadRequestException('Invalid resource kind. Expected "Scorecard".');
    }
    const scorecardName = updateScorecardDto.metadata.name;
    if (!scorecardName) {
      throw new BadRequestException('Scorecard name is required in metadata.');
    }
    const scorecardSpec = updateScorecardDto.spec;
    if (!scorecardSpec) {
      throw new BadRequestException('Scorecard specification is required.');
    }

    try {
      // Validate metrics exist (using cached metrics)
      if (scorecardSpec.criteria && scorecardSpec.criteria.length > 0) {
        const metricsList = await this.getMetrics();
        const metricNames = metricsList.map((m) => m.name);

        for (const criterion of scorecardSpec.criteria) {
          const metricName = criterion.hasMetricValue.name;
          if (!metricNames.includes(metricName)) {
            throw new BadRequestException({
              field: `spec.criteria.hasMetricValue.name`,
              error: `Referenced metric '${metricName}' does not exist`,
            });
          }
        }
      }

      // Mutation to update scorecard
      const mutation = `
      mutation updateScorecard ($scorecardId: ID! $scorecardDetails: UpdateCompassScorecardInput!) {
        compass {
          updateScorecard(scorecardId: $scorecardId, input: $scorecardDetails) {
            success
            errors {
              message
            }
          }
        }
      }
    `;

      const existingScorecard = await this.getScorecard(id);
      const existingCriteriaMap = new Map(
        existingScorecard.criterias.map((c) => [c.name, c]),
      );

      const newCriteriaMap = new Map(
        (scorecardSpec.criteria || []).map((c) => [c.hasMetricValue.name, c]),
      );

      const createCriteria: any = [];
      const updateCriteria: any = [];
      const deleteCriteriaIds: any = [];

      for (const [name, criterion] of newCriteriaMap.entries()) {
        const existingCriterion = existingCriteriaMap.get(name);

        if (!existingCriterion) {
          createCriteria.push({
            hasMetricValue: {
              weight: criterion.hasMetricValue.weight.toString(),
              name: criterion.hasMetricValue.name,
              metricDefinitionId: criterion.hasMetricValue.metricDefinitionId,
              comparatorValue:
                criterion.hasMetricValue.comparatorValue.toString(),
              comparator: criterion.hasMetricValue.comparator,
            },
          });
        } else {
          updateCriteria.push({
            hasMetricValue: {
              id: existingCriterion.id,
              weight: existingCriterion.weight.toString(),
              name: existingCriterion.name,
              metricDefinitionId: existingCriterion.metricDefinitionId,
            },
          });
        }
      }

      for (const criterion of existingScorecard.criterias) {
        if (!newCriteriaMap.has(criterion.name)) {
          deleteCriteriaIds.push({
            id: criterion.metricDefinitionId,
          });
        }
      }
      const variables = {
        scorecardId: id,
        scorecardDetails: {
          name: scorecardSpec.name,
          description: scorecardSpec.description,
          componentTypeIds: scorecardSpec.componentTypeIds,
          state: scorecardSpec.state,
          importance: scorecardSpec.importance,
          scoringStrategyType: scorecardSpec.scoringStrategyType,
          ownerId: scorecardSpec.ownerId,
          createCriteria,
          updateCriteria,
          deleteCriteria: deleteCriteriaIds,
        },
      };

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.updateScorecard ||
        result.compass.updateScorecard.success === false
      ) {
        const errorMsg = result?.compass?.updateScorecard?.errors?.[0]?.message || 'Unknown error during scorecard update';
        throw new BadRequestException(`Failed to update scorecard: ${errorMsg}`);
      }

      this.clearCaches(); // Invalidate cache after update
      const updatedScorecardData = await this.getScorecard(id); // Re-fetch to get full data
      const changes = this.generateChangeLog(existingScorecard, updatedScorecardData); // Use DTO as updated

      return { scorecard: updatedScorecardData, changes };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.graphqlService.getLogger().error(`Failed to update scorecard ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update scorecard: ${error.message}`);
    }
  }

  async createScorecard(
    createScorecardDto: CreateScorecardDto,
  ): Promise<ScorecardResponseDto> {
    if (createScorecardDto.kind !== 'Scorecard') {
      throw new BadRequestException('Invalid resource kind. Expected "Scorecard".');
    }
    const scorecardName = createScorecardDto.metadata.name;
    if (!scorecardName) {
      throw new BadRequestException('Scorecard name is required in metadata.');
    }
    const scorecardSpec = createScorecardDto.spec;
    if (!scorecardSpec) {
      throw new BadRequestException('Scorecard specification is required.');
    }

    // Check if scorecard with the same name already exists
    try {
      await this.getScorecardByName(scorecardName);
      // If getScorecardByName succeeds, it means a scorecard with this name exists.
      throw new ConflictException(
        `Scorecard with name '${scorecardName}' already exists.`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        // This is the expected case: scorecard does not exist, so we can proceed.
      } else if (error instanceof ConflictException) {
        throw error; // Re-throw the conflict exception
      } else {
        // Any other error during the check should be logged and re-thrown
         this.graphqlService.getLogger().error(
          `Unexpected error while checking for existing scorecard '${scorecardName}': ${error.message}`,
           error.stack,
         );
        throw error;
      }
    }

    try {
      // Validate component type IDs
      if (
        !scorecardSpec.componentTypeIds ||
        scorecardSpec.componentTypeIds.length === 0
      ) {
        throw new BadRequestException({
          field: 'spec.componentTypeIds',
          error: 'At least one component type ID is required',
        });
      }

      // Validate metrics exist and transform criteria
      if (!scorecardSpec.criteria || scorecardSpec.criteria.length === 0) {
        throw new BadRequestException({
          field: 'spec.criteria',
          error: 'At least one criterion is required',
        });
      }

      const criteriaForMutation = scorecardSpec.criteria.map((criterion) => {
        return {
          hasMetricValue: {
            weight: criterion.hasMetricValue.weight.toString(),
            name: criterion.hasMetricValue.name,
            metricDefinitionId: criterion.hasMetricValue.metricDefinitionId,
            comparatorValue:
              criterion.hasMetricValue.comparatorValue.toString(),
            comparator: criterion.hasMetricValue.comparator,
          },
        };
      });

      // GraphQL mutation to create scorecard
      const mutation = `
        mutation createScorecard ($cloudId: ID!, $scorecardDetails: CreateCompassScorecardInput!) {
          compass {
            createScorecard(cloudId: $cloudId, input: $scorecardDetails) {
              success
              scorecardDetails {
                id
                criterias {
                  id
                  name
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
        scorecardDetails: {
          name: scorecardSpec.name,
          description: scorecardSpec.description,
          componentTypeIds: scorecardSpec.componentTypeIds,
          state: scorecardSpec.state,
          importance: scorecardSpec.importance,
          scoringStrategyType: scorecardSpec.scoringStrategyType,
          criterias: criteriaForMutation,
          ownerId: scorecardSpec.ownerId,
        },
      };

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.createScorecard ||
        !result.compass.createScorecard.scorecardDetails ||
        result.compass.createScorecard.success === false
      ) {
        const errorMsg = result?.compass?.createScorecard?.errors?.[0]?.message || 'Unknown error during scorecard creation';
        throw new BadRequestException(`Failed to create scorecard: ${errorMsg}`);
      }

      this.clearCaches(); // Invalidate cache after creation
      // The GQL response for create might be minimal, so re-fetch to get the full DTO
      // However, the problem description implies the GQL response is sufficient for the DTO.
      // For now, map directly from GQL response.
      const createdDetails = result.compass.createScorecard.scorecardDetails;
      const metrics = await this.getMetrics(); // Needed for mapping criteria names to IDs
      return this.mapToScorecardResponseDto(createdDetails, metrics, scorecardSpec);

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      this.graphqlService.getLogger().error(`Failed to create scorecard: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create scorecard: ${error.message}`);
    }
  }

  async deleteScorecard(id: string): Promise<{ id: string; message: string }> {
    // First check if the scorecard exists
    await this.getScorecard(id); // Throws NotFoundException if not found

    try {
      const mutation = `
        mutation deleteScorecard($scorecardId: ID!) {
          compass {
            deleteScorecard(scorecardId: $scorecardId) {
              scorecardId
              errors {
                message
              }
              success
            }
          }
        }
      `;

      const variables = {
        scorecardId: id,
      };

      const result = await this.graphqlService.executeMutation(
        mutation,
        variables,
      );

      if (
        !result ||
        !result.compass ||
        !result.compass.deleteScorecard ||
        result.compass.deleteScorecard.success === false
      ) {
        const errorMsg = result?.compass?.deleteScorecard?.errors?.[0]?.message || 'Unknown error during scorecard deletion';
        // Check for potential "in use" type errors, though GQL schema would be better
        if (errorMsg.toLowerCase().includes("foreign key constraint") || errorMsg.toLowerCase().includes("still referenced")) {
            throw new ConflictException(`Failed to delete scorecard: ${errorMsg}. It may be in use.`);
        }
        throw new BadRequestException(`Failed to delete scorecard: ${errorMsg}`);
      }
      this.clearCaches(); // Invalidate cache after deletion
      return { id, message: `Scorecard with ID '${id}' deleted successfully.` };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      this.graphqlService.getLogger().error(`Failed to delete scorecard ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete scorecard: ${error.message}`);
    }
  }

  // Helper to map GQL scorecard data to ScorecardResponseDto
  private mapToScorecardResponseDto(
    scorecardData: any,
    metrics: MetricResponseDto[],
    specFromInput?: any // Optional: spec from create/update DTO if GQL response is minimal
  ): ScorecardResponseDto {
    const spec = specFromInput || scorecardData; // Use spec from input if GQL's is less detailed for new/updated items

    const mappedCriterias = (scorecardData.criterias || []).map((crit) => {
      const metric = metrics.find(m => m.id === crit.metricDefinitionId || m.name === crit.name);
      return {
        id: crit.id, // Criteria ID from GQL
        metricDefinitionId: metric?.id || crit.metricDefinitionId || '', // Ensure we have an ID
        name: metric?.name || crit.name,
        weight: parseFloat(crit.weight) || 1.0, // Ensure weight is a number
        // Comparator and value might not be directly on scorecardData.criterias from search query
        // These might need to be sourced from `spec.criteria` if this is after a create/update
        comparator: crit.hasMetricValue?.comparator || spec.criteria?.find(c => c.name === crit.name || c.hasMetricValue?.name === crit.name)?.hasMetricValue?.comparator,
        comparatorValue: parseFloat(crit.hasMetricValue?.comparatorValue) || spec.criteria?.find(c => c.name === crit.name || c.hasMetricValue?.name === crit.name)?.hasMetricValue?.comparatorValue,
      };
    });

    return {
      id: scorecardData.id,
      name: scorecardData.name || spec.name,
      description: scorecardData.description || spec.description || '',
      componentTypeIds: scorecardData.componentTypeIds || spec.componentTypeIds || [],
      owner: scorecardData.owner || { name: spec.ownerId }, // GQL might return full owner object
      criterias: mappedCriterias,
      state: scorecardData.state || spec.state,
      type: scorecardData.type || '', // GQL 'type' for scorecard
      verified: scorecardData.verified !== undefined ? scorecardData.verified : true, // Default to true if not specified
      importance: scorecardData.importance || spec.importance,
      scoringStrategyType: scorecardData.scoringStrategyType || spec.scoringStrategyType,
      // Ensure spec is part of the DTO for full detail
      spec: {
        name: scorecardData.name || spec.name,
        description: scorecardData.description || spec.description || '',
        componentTypeIds: scorecardData.componentTypeIds || spec.componentTypeIds || [],
        ownerId: scorecardData.owner?.id || spec.ownerId, // Assuming owner object has id
        criteria: mappedCriterias.map(mc => ({ // map back to a structure similar to CreateScorecardDto spec criteria
            hasMetricValue: {
                metricDefinitionId: mc.metricDefinitionId,
                name: mc.name,
                weight: mc.weight,
                comparator: mc.comparator,
                comparatorValue: mc.comparatorValue,
            }
        })),
        state: scorecardData.state || spec.state,
        importance: scorecardData.importance || spec.importance,
        scoringStrategyType: scorecardData.scoringStrategyType || spec.scoringStrategyType,
      }
    };
  }
}
