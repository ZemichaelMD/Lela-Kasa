import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Binary/streamed responses (PDFs, file downloads) must NOT be JSON-wrapped —
        // doing so would replace the byte stream with `{"success":true,"data":{}}`.
        if (data instanceof StreamableFile) {
          return data;
        }
        // Node streams or Buffers — same reasoning.
        if (Buffer.isBuffer(data)) {
          return data;
        }
        if (
          data &&
          typeof data === 'object' &&
          typeof (data as { pipe?: unknown }).pipe === 'function'
        ) {
          return data;
        }
        // If the handler already returned an envelope (e.g. paginated list), pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data as ResponseEnvelope<unknown>;
        }
        return {
          success: true as const,
          data,
        };
      }),
    );
  }
}
