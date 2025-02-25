import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  // eslint-disable-next-line class-methods-use-this
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    // const request = ctx.getRequest()

    // eslint-disable-next-line no-console
    console.log(exception);

    const exceptionResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'INTERNAL_SERVER_ERROR';
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseObj: any = {
      status,
      message: exceptionResponse,
    };

    try {
      if (typeof exceptionResponse === 'object') {
        if (exceptionResponse.message) {
          if (Array.isArray(exceptionResponse.message)) {
            const [firstMessage] = exceptionResponse.message;
            responseObj.message = firstMessage;
          } else if (typeof exceptionResponse.message === 'string') {
            responseObj.message = exceptionResponse.message;
          }
        }

        if (exceptionResponse.errorCode) {
          responseObj.errorCode = exceptionResponse.errorCode;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('An error occured on exception filter', error);

      return response.status(500).end();
    }

    response.status(status).send(responseObj);
  }
}
