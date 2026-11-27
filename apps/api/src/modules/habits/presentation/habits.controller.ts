import { Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { createHabitSchema, dateKeySchema, idSchema, toggleHabitLogSchema, updateHabitSchema } from '@pyneath/contracts';
import { body, principal } from '../../../platform/http/request';
import { HABITS_ACCESS, type HabitsAccess } from '../application/habits.ports';
import { HabitNotFoundError } from '../application/habits.service';

function resolveToday(raw?: string): string {
  return raw ? dateKeySchema.parse(raw) : new Date().toISOString().slice(0, 10);
}

@Controller('api/v1/me/habits')
export class HabitsController {
  constructor(@Inject(HABITS_ACCESS) private readonly habits: HabitsAccess) {}

  @Get()
  async list(@Req() req: Request, @Query('today') today?: string) {
    return { habits: await this.habits.list(principal(req).id, resolveToday(today)) };
  }

  @Post()
  async create(@Req() req: Request, @Query('today') today?: string) {
    return { habit: await this.habits.create(principal(req).id, body(createHabitSchema, req), resolveToday(today)) };
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') rawId: string, @Query('today') today?: string) {
    const id = idSchema.parse(rawId);
    try {
      return { habit: await this.habits.update(principal(req).id, id, body(updateHabitSchema, req), resolveToday(today)) };
    } catch (error) {
      if (error instanceof HabitNotFoundError) throw new NotFoundException('Habit not found');
      throw error;
    }
  }

  @Put(':id/logs')
  async toggleLog(@Req() req: Request, @Param('id') rawId: string) {
    const id = idSchema.parse(rawId);
    try {
      return { log: await this.habits.toggleLog(principal(req).id, id, body(toggleHabitLogSchema, req)) };
    } catch (error) {
      if (error instanceof HabitNotFoundError) throw new NotFoundException('Habit not found');
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('id') rawId: string) {
    const id = idSchema.parse(rawId);
    try {
      await this.habits.remove(principal(req).id, id);
    } catch (error) {
      if (error instanceof HabitNotFoundError) throw new NotFoundException('Habit not found');
      throw error;
    }
  }
}
