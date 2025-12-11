import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.getErrorDetails(exception);

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logException(exception, request, status);

    response.status(status).json(errorResponse);
  }

  private getErrorDetails(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          status,
          message: response,
          error: exception.name,
        };
      }

      const responseObj = response as Record<string, unknown>;
      return {
        status,
        message: this.extractMessage(responseObj),
        error: (responseObj.error as string) || exception.name,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }

  private extractMessage(response: Record<string, unknown>): string {
    const message = response.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return 'An error occurred';
  }

  private logException(
    exception: unknown,
    request: Request,
    status: number,
  ): void {
    const method = request.method;
    const url = request.url;

    if (status >= 500) {
      this.logger.error(
        `${method} ${url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${method} ${url} - ${status}: ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    }
  }
}
