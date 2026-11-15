# Prompt Registry

Each prompt/template has a stable ID, capability, language, input fields, output schema version, safety version, model compatibility and evaluation revision.

Example identifiers: `assist-start-v1`, `stuck-recovery-v1`, `seed-draft-v1`. Changes require a new identifier or revision plus regression evaluation; do not edit a served prompt in place without traceability.

The local/preview OpenAI demo serves `assist-start-v1` and `seed-draft-v1` in Vietnamese with output contract version `1`. The API treats the submitted text as data, asks for one short suggestion, and validates the structured result.

The shared three-capability provider prompt is `pyneath-assistance-v2.2`, maintained in `packages/contracts/src/assistance-prompt.ts` and exported into `ml/configs/assistance-protocol-v2.json`. It focuses on Vietnamese student learning in IT and software engineering. The optional Luna/Beeknoee tone and grounding candidate is `pyneath-assistance-v2.4`; it is only active with `API_ASSISTANCE_QUALITY_V2=true`. Provider-specific event labels add the provider and configuration suffix. CI checks source/protocol drift. The domain specialization is prompt guidance with mock regression coverage; it has not been evaluated with fresh model inference and is not a measured quality gain.
