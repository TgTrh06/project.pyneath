import { Inject, Injectable } from '@nestjs/common';
import { assistanceContextSchema } from '@pyneath/contracts';
import { FOCUS_CONTEXT_READER, type FocusContextReader } from '../../focus/public-api';
import { SEED_ACCESS, type SeedAccess } from '../../seed/public-api';
import type { AssistanceContextAccess } from '../application/assistance-tools';

@Injectable()
export class AssistanceContext implements AssistanceContextAccess {
  constructor(@Inject(FOCUS_CONTEXT_READER) private readonly focus: FocusContextReader,
    @Inject(SEED_ACCESS) private readonly seeds: SeedAccess) {}

  async load(accountId: string) {
    const [focus, seed] = await Promise.all([this.focus.readOwnContext(accountId), this.seeds.get(accountId)]);
    return assistanceContextSchema.parse({
      get_current_focus_context: focus,
      get_my_open_seed: seed ? { text: seed.text } : null
    });
  }
}
