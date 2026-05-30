import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { SyncService } from "./sync.service";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

@Controller("sync")
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  async sync(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.syncService.sync(user, body);
  }
}
