import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { HABITS_ACCESS } from './application/habits.ports';
import { HabitsService } from './application/habits.service';
import { DrizzleHabitsRepository } from './infrastructure/habits.repository';
import { HabitsController } from './presentation/habits.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HabitsController],
  providers: [
    DrizzleHabitsRepository,
    {
      provide: HABITS_ACCESS,
      inject: [DrizzleHabitsRepository],
      useFactory: (repo: DrizzleHabitsRepository) => new HabitsService(repo),
    },
  ],
  exports: [HABITS_ACCESS],
})
export class HabitsModule {}
