import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

import { UsersService } from './users.service';
import { CurrentShopId } from '../common/decorators/current-shop.decorator';
import { Roles } from '../common/decorators/roles.decorator';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class InviteEmployeeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+]?[0-9\s-]{9,16}$/, {
    message: "Enter a valid phone number, e.g. 0927646246",
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;
}

class ResetEmployeePasswordDto {
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  pin?: string;
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('users')
@ApiBearerAuth()
@Roles('OWNER')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all employees in my shop (OWNER only)' })
  listEmployees(@CurrentShopId() shopId: string) {
    return this.usersService.listEmployees(shopId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single employee (OWNER only)' })
  getEmployee(@CurrentShopId() shopId: string, @Param('id') id: string) {
    return this.usersService.getEmployee(shopId, id);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite / create an employee account (OWNER only)' })
  inviteEmployee(
    @CurrentShopId() shopId: string,
    @Body() dto: InviteEmployeeDto,
  ) {
    return this.usersService.inviteEmployee(shopId, dto);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset an employee password (OWNER only)' })
  async resetEmployeePassword(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
    @Body() dto: ResetEmployeePasswordDto,
  ) {
    await this.usersService.resetEmployeePassword(shopId, id, dto.newPassword);
    return { success: true };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an employee (OWNER only)' })
  updateEmployee(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.usersService.updateEmployee(shopId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an employee (soft-delete, OWNER only)' })
  async removeEmployee(
    @CurrentShopId() shopId: string,
    @Param('id') id: string,
  ) {
    await this.usersService.removeEmployee(shopId, id);
  }
}
