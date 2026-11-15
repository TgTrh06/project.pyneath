import { Controller, Get, Inject, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AssistanceToolsConfig } from '@pyneath/contracts';
import { principal } from '../../../platform/http/request';
import { API_CONFIG, type ApiConfig } from '../../../platform/config/api-config';
import { AssistanceService } from '../application/assistance.service';

// Provider metadata only. Context is read internally for every suggestion.
@Controller('api/v1/me/assistance/tools')
export class AssistanceToolsController {
  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig, private readonly assistance: AssistanceService) {}
  @Get('config')
  configuration(@Req() req: Request): AssistanceToolsConfig {
    principal(req);
    const enabled = this.assistance.configuration().enabled;
    return { enabled, provider: this.config.API_ASSISTANCE_PROVIDER,
      tools: enabled ? ['get_current_focus_context', 'get_my_open_seed'] : [] };
  }
}
