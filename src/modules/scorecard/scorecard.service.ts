import { BadRequestException, Injectable } from '@nestjs/common';
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
  constructor(
    private readonly configService: ConfigService,
    private readonly graphqlService: GraphQLService,
    private readonly metricService: MetricService,
  ) {}

  private scorecardList: ScorecardResponseDto[] = [];

  async getAllScorecards(): Promise<ScorecardResponseDto[]> {
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
    if (!result || !result.compass || !result.compass.scorecards) {
      throw new BadRequestException('Failed to fetch scorecards');
    }

    // Ensure we have metrics to associate with scorecards
    const metricsList = await this.metricService.getAllMetrics();
    if (!metricsList || metricsList.length === 0) {
      throw new BadRequestException(
        'No metrics found to associate with scorecards',
      );
    }

    // Map the metrics to the scorecards by name
    for (const scorecard of result.compass.scorecards.nodes) {
      if (scorecard.criterias && scorecard.criterias.length > 0) {
        for (const criteria of scorecard.criterias) {
          if (!criteria.metricDefinitionId) {
            const metric = metricsList.find((m) => m.name === criteria.name);
            if (metric) {
              criteria.metricDefinitionId = metric.id;
            }
          }
        }
      }
    }

    this.scorecardList = result.compass.scorecards.nodes || [];
    return this.scorecardList;
  }

  async getScorecard(id: string): Promise<ScorecardResponseDto> {
    const allScorecards = await this.getAllScorecards();
    const scorecard = allScorecards.find((s) => s.id === id);
    if (!scorecard) {
      throw new BadRequestException(`Scorecard with id ${id} not found`);
    }
    return scorecard;
  }

  async getScorecardByName(name: string): Promise<ScorecardResponseDto> {
    const allScorecards = await this.getAllScorecards();
    const scorecard = allScorecards.find((s) => s.name === name);
    if (!scorecard) {
      throw new BadRequestException(`Scorecard with name ${name} not found`);
    }
    return scorecard;
  }

  async updateScorecard(
    id: string,
    updateScorecardDto: CreateScorecardDto,
  ): Promise<ScorecardResponseDto> {
    try {
      // Validate inputs
      if (updateScorecardDto.kind !== 'Scorecard') {
        throw new BadRequestException(
          'Invalid resource kind. Expected "Scorecard"',
        );
      }

      const scorecardName = updateScorecardDto.metadata.name;
      if (!scorecardName) {
        throw new BadRequestException('Scorecard name is required in metadata');
      }

      const scorecardSpec = updateScorecardDto.spec;
      if (!scorecardSpec) {
        throw new BadRequestException('Scorecard specification is required');
      }

      // Validate metrics exist
      if (scorecardSpec.criteria && scorecardSpec.criteria.length > 0) {
        const metricsList = await this.metricService.getAllMetrics();
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
        const errorMsg =
          result?.compass?.updateScorecard?.errors?.[0]?.message ||
          'Unknown error';
        throw new BadRequestException(
          `Failed to update scorecard: ${errorMsg}`,
        );
      }

      return result.compass.updateScorecard;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update scorecard: ${error.message}`,
      );
    }
  }

  async createScorecard(
    createScorecardDto: CreateScorecardDto,
  ): Promise<ScorecardResponseDto> {
    try {
      // Validate inputs
      if (createScorecardDto.kind !== 'Scorecard') {
        throw new BadRequestException(
          'Invalid resource kind. Expected "Scorecard"',
        );
      }

      const scorecardName = createScorecardDto.metadata.name;
      if (!scorecardName) {
        throw new BadRequestException('Scorecard name is required in metadata');
      }

      const scorecardSpec = createScorecardDto.spec;
      if (!scorecardSpec) {
        throw new BadRequestException('Scorecard specification is required');
      }

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
        const errorMsg =
          result?.compass?.createScorecard?.errors?.[0]?.message ||
          'Unknown error';
        throw new BadRequestException(
          `Failed to create scorecard: ${errorMsg}`,
        );
      }

      const createdScorecard = result.compass.createScorecard.scorecardDetails;
      return {
        id: createdScorecard.id,
        name: createdScorecard.name,
        state: createdScorecard.state,
        type: '',
        verified: true,
        description: createdScorecard.description || '',
        componentTypeIds: createdScorecard.componentTypeIds || [],
        owner: createdScorecard.owner || { name: scorecardSpec.ownerId },
        criterias: createdScorecard.criterias.map((criteria) => ({
          metricDefinitionId: criteria.metricDefinitionId,
          weight: criteria.weight,
          name: criteria.name,
        })) as CriteriaResponseDto[],
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create scorecard: ${error.message}`,
      );
    }
  }

  async deleteScorecard(id: string): Promise<void> {
    try {
      // First check if the scorecard exists
      await this.getScorecard(id);

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
        const errorMsg =
          result?.compass?.deleteScorecard?.errors?.[0]?.message ||
          'Unknown error';
        throw new BadRequestException(
          `Failed to delete scorecard: ${errorMsg}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete scorecard: ${error.message}`,
      );
    }
  }
}
