import { PreferencesModule } from '../preferences/preferences.module';
import { PREFERENCES_ACCESS, type PreferencesAccess } from '../preferences/public-api';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../platform/database/database.module';
import { CampModule } from '../camp/camp.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PactController } from './presentation/pact.controller';
import { PactService } from './application/pact.service';
import { PACT_ACCESS } from './application/pact.ports';
import { DrizzlePactRepository } from './infrastructure/pact.repository';
import { PostgresUnitOfWork } from '../../platform/database/postgres-unit-of-work';
import { CAMP_ACCESS, type CampAccess } from '../camp/public-api';
import { ANALYTICS, type Analytics } from '../analytics/public-api';
import { decodeCursor, encodeCursor } from '../../platform/http/pagination';
import { Subject } from 'rxjs';
import { PACT_EVENTS, type PactEvents } from './application/pact.ports';
@Module({ imports: [DatabaseModule, CampModule, AnalyticsModule, PreferencesModule], controllers: [PactController], providers: [DrizzlePactRepository,
  { provide: PACT_EVENTS, useFactory: (): PactEvents => ({ changes: new Subject() }) },
  { provide: PactService, inject: [DrizzlePactRepository, PostgresUnitOfWork, CAMP_ACCESS, ANALYTICS, PREFERENCES_ACCESS, PACT_EVENTS],
    useFactory: (repository: DrizzlePactRepository, transactions: PostgresUnitOfWork, camps: CampAccess, analytics: Analytics, preferences: PreferencesAccess, events: PactEvents) =>
      new PactService(repository, transactions, camps, analytics, { now: () => new Date() }, { decode: decodeCursor, encode: encodeCursor }, preferences, events) },
  { provide: PACT_ACCESS, useExisting: PactService },
], exports: [PACT_ACCESS] })
export class PactModule {}
