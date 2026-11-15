import { Module } from '@nestjs/common';
import { FocusModule } from '../focus/focus.module';
import { IdentityModule } from '../identity/identity.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { PactModule } from '../pact/pact.module';
import { PresenceGateway } from './presentation/presence.gateway';
@Module({ imports: [IdentityModule, FocusModule, PreferencesModule, PactModule], providers: [PresenceGateway] })
export class PresenceModule {}
