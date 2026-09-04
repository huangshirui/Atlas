# Security

AISR Atlas is a public repository and may eventually integrate with infrastructure, runtime and operational systems. Treat secrets and production metadata as sensitive by default.

## Do not commit

- API tokens, access tokens, cookies, credentials or private keys;
- `.env` / `.dev.vars` values;
- Cloudflare, GitHub, n8n or other provider secrets;
- private family / user data;
- production database exports;
- signed URLs or URLs embedding credentials;
- internal infrastructure details that are not intended to be public.

Use placeholders and synthetic data in examples and tests.

## Reporting

Until a dedicated private security reporting channel is configured, do not open a public issue containing an exploitable secret or private infrastructure detail. Contact the repository owner privately through an appropriate existing channel.
