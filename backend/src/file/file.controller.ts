import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';

import { FileService } from './file.service';
import { CONTEXT_POLICIES, type UploadContext } from './upload-context';

/**
 * Media uploads. The matching public read endpoint is served by Express's
 * static middleware (configured in `main.ts`) at `/uploads/*` — it bypasses
 * Nest's guard/interceptor pipeline so images load without auth and without
 * being wrapped in the response envelope.
 */
@ApiTags('media')
@Controller('media')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a file (multipart/form-data, field name: "file")',
  })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('context') context: UploadContext = 'image',
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Missing "file" field');
    if (!CONTEXT_POLICIES[context]) {
      throw new BadRequestException(`Unknown upload context: ${context}`);
    }
    return this.fileService.validateAndStore(file, context, user?.id);
  }
}
