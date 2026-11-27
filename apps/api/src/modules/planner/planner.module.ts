import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { PLANNER_ACCESS } from './application/planner.ports';
import { PlannerService } from './application/planner.service';
import { DrizzlePlannerRepository } from './infrastructure/planner.repository';
import { PlannerController } from './presentation/planner.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [PlannerController],
  providers: [
    DrizzlePlannerRepository,
    {
      provide: PLANNER_ACCESS,
      inject: [DrizzlePlannerRepository],
      useFactory: (repo: DrizzlePlannerRepository) => new PlannerService(repo),
    },
  ],
  exports: [PLANNER_ACCESS],
})
export class PlannerModule {}
