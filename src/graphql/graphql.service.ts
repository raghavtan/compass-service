import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GraphQLClient } from 'graphql-request';

@Injectable()
export class GraphQLService {
  private readonly logger = new Logger(GraphQLService.name);
  private client: GraphQLClient;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('compass.graphqlEndpoint');
    const token = this.configService.get<string>('compass.apiToken');
    const cloudId = this.configService.get<string>('compass.cloudId');

    this.logger.log(
      `Initializing GraphQL client with endpoint: ${endpoint || 'not configured'}`,
    );

    if (!endpoint) {
      this.logger.error(
        'GraphQL endpoint not configured! Check COMPASS_HOST environment variable.',
      );
    }

    if (!token) {
      this.logger.error(
        'API token not configured! Check COMPASS_API_TOKEN environment variable.',
      );
    }

    if (!cloudId) {
      this.logger.error(
        'Cloud ID not configured! Check COMPASS_CLOUD_ID environment variable.',
      );
    }

    if (endpoint != null) {
      this.logger.log(`Creating GraphQL client for endpoint: ${endpoint}`);
      this.client = new GraphQLClient(endpoint, {
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } else {
      this.logger.warn(
        'GraphQL client not initialized due to missing configuration',
      );
    }
  }

  async executeQuery<T = any>(query: string, variables?: any): Promise<T> {
    try {
      if (!this.client) {
        this.logger.error(
          'GraphQL client not initialized. Cannot execute query.',
        );
        throw new Error('GraphQL client not initialized');
      }

      const operationName = this.extractOperationName(query);
      this.logger.debug(
        `Executing GraphQL query: ${operationName || 'unnamed query'}`,
      );

      const result = await this.client.request<T>(query, variables);
      this.logger.debug(
        `Query ${operationName || 'unnamed'} executed successfully`,
      );
      return result;
    } catch (error) {
      this.logger.error(`GraphQL query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async executeMutation<T = any>(
    mutation: string,
    variables?: any,
  ): Promise<T> {
    try {
      if (!this.client) {
        this.logger.error(
          'GraphQL client not initialized. Cannot execute mutation.',
        );
        throw new Error('GraphQL client not initialized');
      }

      const operationName = this.extractOperationName(mutation);
      this.logger.debug(
        `Executing GraphQL mutation: ${operationName || 'unnamed mutation'}`,
      );

      const result = await this.client.request<T>(mutation, variables);
      this.logger.debug(
        `Mutation ${operationName || 'unnamed'} executed successfully`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `GraphQL mutation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private extractOperationName(queryOrMutation: string): string | null {
    const match = queryOrMutation.match(/(?:query|mutation)\s+([A-Za-z0-9_]+)/);
    return match ? match[1] : null;
  }
}
