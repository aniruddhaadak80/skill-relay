# Security Policy

## Reporting a vulnerability

Please open a private GitHub security advisory for serious issues. Do not include real credentials, private source URLs, or customer data in an issue.

Include:

- affected route or component;
- reproduction steps using synthetic data;
- impact and expected behavior;
- whether the issue exposes third-party skill content or persistence data.

## Scope notes

Skill Relay does not execute upstream skill instructions or scripts. It does fetch public metadata from external services and persists user-created relay packs in Neon. Reports about malicious upstream skill content are valuable, but include the source URL and a safe reproduction.

## Data handling

The app stores the fields required for a relay pack: name, task, selected public skill ID/name, target harnesses, notes, status, timestamps, and audit hashes. Avoid putting secrets into those fields because they are intended to be exportable workspace data.

## Safe fixes

We welcome patches that improve input validation, source labeling, rate limiting, audit verification, and safe handling of third-party metadata.
