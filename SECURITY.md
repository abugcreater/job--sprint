# Security Policy

## Reporting a Vulnerability

Please report security issues privately to the project maintainer. Do not create public GitHub issues containing:

- API keys, access tokens, passwords, signing keys, private certificates, or session secrets.
- Exploit details that allow unauthorized access.
- Personal resume, job-search, interview, customer, or business records.
- Server IPs, private hostnames, or deployment credentials.

If this project is published on GitHub, configure a private security advisory or provide a private contact channel before accepting external reports.

## Secret Handling

- Store real secrets in environment variables, local untracked files, or a secret manager.
- Keep `.env`, `.env.*`, keystores, certificates, runtime databases, and evidence reports out of Git.
- Rotate any secret that was ever committed, even if it was later deleted.
- If sensitive data appears in Git history, rewrite history before publishing the repository.

## Supported Versions

This project has not published a stable release yet. Security fixes should target the active development branch until a release policy is defined.
