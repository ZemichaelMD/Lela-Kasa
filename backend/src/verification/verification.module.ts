import { Global, Module } from '@nestjs/common';
import { VerificationService } from './verification.service';

/**
 * Global so any feature module can record or read verification state without
 * threading the import through every module graph.
 */
@Global()
@Module({
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
