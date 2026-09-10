# Quality & Reliability Guardrails for Boutique Pâtisserie

- **Token Resilience**: Admin actions must always verify that `adminToken` is valid. If expired, immediately present the login interface rather than silently failing.
- **Form Safety**: Form inputs must provide safe fallbacks for optional or dropdown fields so that submission never fails on undefined values.
- **Build Verification**: Every frontend change must be compiled using `npm.cmd --prefix client run build` and verified before declaring completion.
- **Zero Broken Links**: Navigation must only link to active, registered pages.
