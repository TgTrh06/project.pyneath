import type { AssistanceContextAccess } from '../../src/modules/assistance/application/assistance-tools';
export const emptyAssistanceContext: AssistanceContextAccess = {
  load: async () => ({ get_current_focus_context: null, get_my_open_seed: null })
};
