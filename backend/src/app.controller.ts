import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
@Public()
export class AppController {
  constructor(private readonly app: AppService) {}

  @Get()
  root() {
    return this.app.getInfo();
  }

  @Get('health')
  health() {
    return this.app.getHealth();
  }

  @Get('version')
  version() {
    return this.app.getVersion();
  }

  @Get('ping')
  ping() {
    return this.app.ping();
  }
}
