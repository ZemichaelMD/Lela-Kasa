import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ShopSetting } from "../database";

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAll(shopId: string): Promise<ShopSetting[]> {
    return this.prisma.shopSetting.findMany({ where: { shopId } });
  }

  async get(shopId: string, key: string): Promise<string | null> {
    const setting = await this.prisma.shopSetting.findUnique({
      where: { shopId_key: { shopId, key } },
    });
    return setting?.value ?? null;
  }

  async set(shopId: string, key: string, value: string): Promise<ShopSetting> {
    return this.prisma.shopSetting.upsert({
      where: { shopId_key: { shopId, key } },
      create: { shopId, key, value },
      update: { value },
    });
  }

  async delete(shopId: string, key: string): Promise<void> {
    await this.prisma.shopSetting.deleteMany({
      where: { shopId, key },
    });
  }

  async setMany(
    shopId: string,
    entries: Record<string, string>,
  ): Promise<ShopSetting[]> {
    const results: ShopSetting[] = [];
    for (const [key, value] of Object.entries(entries)) {
      results.push(await this.set(shopId, key, value));
    }
    return results;
  }
}
