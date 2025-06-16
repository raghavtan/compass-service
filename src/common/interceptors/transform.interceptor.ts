import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returns an ApiResponse, use it directly
        if (data instanceof ApiResponse) {
          return data;
        }

        // Otherwise, create a new ApiResponse with default success values
        const httpContext = context.switchToHttp();
        const response = httpContext.getResponse();
        const statusCode = response.statusCode;

        let message = 'Operation completed successfully';
        let responseData: any = data;
        let additionalRootProperties: Record<string, any> = {};

        if (data && typeof data === 'object') {
          if (data.message) {
            message = data.message;
          }

          // Handle specific structures for 201 (Created) responses
          if (statusCode === 201 && data.id) {
            additionalRootProperties.id = data.id;
            // If other properties like metricSources or the full entity should be in data field
            if (Object.keys(data).length > (data.message ? 2 : 1) || !data.message) { // more than just id and message
                 // Clone data and remove properties that were moved to root or are messages
                const dataClone = { ...data };
                delete dataClone.message; // message is for top level
                delete dataClone.id;     // id is moved to top level for 201

                if (Object.keys(dataClone).length > 0) {
                    responseData = dataClone;
                } else {
                    responseData = undefined; // Avoid empty data object if only id and message were present
                }
            } else {
                 // If data only contained id and message (or just id), then data field can be undefined
                responseData = undefined;
            }
          } else if (data.data !== undefined && data.message) {
            // If the service/controller returned an object already shaped like { message: '...', data: ... }
            // (though current refactor has them returning simpler objects)
            responseData = data.data;
            // message is already set from data.message
          } else if (data.message && Object.keys(data).length === 1) {
            // If data is ONLY { message: '...' }, then actual data payload is null/undefined
            responseData = undefined;
          }
          // For PUT/PATCH (200 OK typically) or DELETE (200 OK) that return { id, message, changes/deletedId, data (optional) }
          // The current structure nests everything under 'data'.
          // If 'data' property exists at root of what controller returned, and it also had 'id' or 'message',
          // we assume 'data' is the main payload.
          // Example: { message: "Updated", id: "123", changes: [], data: { actual_entity } }
          // The interceptor would make: { statusCode, message: "Updated", data: { id: "123", changes: [], data: { actual_entity } } }
          // This is because `responseData` is initially `data` (the whole object).
          // This is acceptable.
        }

        const apiResponse = ApiResponse.success(statusCode, message, responseData);
        // Merge additional root properties (like ID for 201) into the ApiResponse object
        if (Object.keys(additionalRootProperties).length > 0) {
            Object.assign(apiResponse, additionalRootProperties);
        }
        return apiResponse;
      }),
    );
  }
}
