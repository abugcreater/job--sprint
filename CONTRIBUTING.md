# Contributing

Thanks for improving Job Sprint Coach.

## Development Workflow

1. Fork or branch from the latest main branch.
2. Install dependencies with `npm install` and `npm --prefix apps/react-web install`.
3. Copy `.env.example` to `.env` and use only local placeholder data.
4. Keep changes focused and covered by tests when possible.
5. Run relevant checks before opening a pull request:

```bash
npm run scan:sensitive
npm test
npm --prefix apps/react-web test
```

## Security Rules

- Do not commit `.env`, credentials, keystores, database files, runtime data, evidence reports, logs, uploads, or private documents.
- Do not add real API tokens, passwords, session secrets, personal resumes, private job-search records, customer data, or internal company data.
- Use placeholders in examples and tests.
- If you accidentally commit a secret, stop and report it privately. Do not open a public issue with the secret value.

## Pull Request Checklist

- Tests or validation steps are documented.
- Public docs do not include private paths, real domains, real IPs, or secrets.
- New environment variables are added to `.env.example` with placeholder values only.
- Generated files are either ignored or intentionally committed as sanitized fixtures.
