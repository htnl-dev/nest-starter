import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { TracingService } from './tracing.service';
import {
  CORRELATION_ID_HEADER,
  CORRELATION_ID_KEY,
  EVENT_TYPE_KEY,
} from './tracing.constants';

@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req: Request, res: Response) => {
          const correlationId =
            (req.headers[CORRELATION_ID_HEADER] as string) || randomUUID();
          cls.set(CORRELATION_ID_KEY, correlationId);
          cls.set(EVENT_TYPE_KEY, 'http');

          // Set correlation ID in response header for traceability
          res.setHeader(CORRELATION_ID_HEADER, correlationId);
        },
      },
    }),
  ],
  providers: [TracingService],
  exports: [TracingService, ClsModule],
})
export class TracingModule {}
