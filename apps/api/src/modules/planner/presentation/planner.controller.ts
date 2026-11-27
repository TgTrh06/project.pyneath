import { Body, Controller, Delete, Get, HttpCode, Inject, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { createPlannerItemSchema, dateKeySchema, idSchema, updatePlannerItemSchema } from '@pyneath/contracts';
import { body, principal } from '../../../platform/http/request';
import { PLANNER_ACCESS, type PlannerAccess } from '../application/planner.ports';
import { PlannerNotFoundError } from '../application/planner.service';

@Controller('api/v1/me/planner')
export class PlannerController {
  constructor(@Inject(PLANNER_ACCESS) private readonly planner: PlannerAccess) {}

  @Get()
  async list(@Req() req: Request, @Query('from') from?: string, @Query('to') to?: string) {
    const parsedFrom = from ? dateKeySchema.parse(from) : undefined;
    const parsedTo = to ? dateKeySchema.parse(to) : undefined;
    const items = await this.planner.list(principal(req).id, { from: parsedFrom, to: parsedTo });
    return { items };
  }

  @Post()
  async create(@Req() req: Request, @Body() _raw: unknown) {
    const item = await this.planner.create(principal(req).id, body(createPlannerItemSchema, req));
    return { item };
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') rawId: string) {
    const id = idSchema.parse(rawId);
    try {
      const item = await this.planner.update(principal(req).id, id, body(updatePlannerItemSchema, req));
      return { item };
    } catch (error) {
      if (error instanceof PlannerNotFoundError) throw new NotFoundException('Planner item not found');
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('id') rawId: string) {
    const id = idSchema.parse(rawId);
    try {
      await this.planner.remove(principal(req).id, id);
    } catch (error) {
      if (error instanceof PlannerNotFoundError) throw new NotFoundException('Planner item not found');
      throw error;
    }
  }
}
