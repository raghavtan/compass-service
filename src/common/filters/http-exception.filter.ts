import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const status = exception.getStatus();

    let message: string;
    let details: any = undefined;
    let errorDescription: string = exception.name.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/_EXCEPTION$/, '');


    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = exceptionResponse as Record<string, any>;
      message = resObj.message || 'An error occurred';
      errorDescription = resObj.error || errorDescription; // Use specific error code if provided
      // Capture common additional properties
      details = resObj.details || resObj.cause?.details || undefined;
      if (resObj.existingId) {
        details = details || {};
        details.existingId = resObj.existingId;
      }
      if (resObj.cause?.existingId && !details?.existingId) { // From ConflictException cause
        details = details || {};
        details.existingId = resObj.cause.existingId;
      }
      if (resObj.dependencies) {
        details = details || {};
        details.dependencies = resObj.dependencies;
      }
       if (resObj.cause?.dependencies && !details?.dependencies) { // From ConflictException cause
        details = details || {};
        details.dependencies = resObj.cause.dependencies;
      }
      // For class-validator errors, NestJS often puts them in message array or under 'constraints'
      if (Array.isArray(resObj.message) && resObj.error === 'Bad Request') { // Typical for class-validator
        details = resObj.message;
        message = 'Validation failed'; // More generic message for validation arrays
      }
    } else {
      message = 'An unknown error occurred';
    }

    // Construct the error response payload manually to include all desired fields
    const errorPayload: any = {
      status_code: status,
      error: errorDescription,
      message: message,
      timestamp: new Date().toISOString(),
    };

    if (details) {
      errorPayload.details = details;
    }

    response.status(status).json(errorPayload);
  }
}
