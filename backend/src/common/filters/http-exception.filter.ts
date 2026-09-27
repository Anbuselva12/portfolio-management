import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorMessage =
      typeof exceptionResponse === 'object' && exceptionResponse?.message
        ? (Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message.join(', ')
            : exceptionResponse.message)
        : (typeof exceptionResponse === 'string'
            ? exceptionResponse
            : 'Internal server error');

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
      error: exceptionResponse,
    });
  }
}
