# AgroConnect — Security

Reference: `@docs/security.md`

## Authentication

- Access tokens: RS256-signed JWTs, 15-minute expiry
- Refresh tokens: opaque 256-bit random tokens, bcrypt-hashed in sessions table, 30-day expiry
- Token rotation: every refresh issues a new refresh token, old one invalidated
- Revocation: logout deletes the session row — no token blocklist needed
- Signing keys: RSA 4096-bit, rotated every 90 days with 24-hour overlap

## Role permissions

| Role | Key permissions |
|---|---|
| farmer | Own farms CRUD, own diagnoses, own loans, market listings, community read/write |
| extension_officer | Service profile, client farm read (with farmer consent), expert badge |
| vet_officer | Service profile, animal diagnosis read, expert badge |
| supplier | Product listings CRUD, order management — no farm record access |
| buyer | Market listings read, orders — no farm management |
| govt_officer | County registrations review, subsidy review — no farm record access |
| admin | All read access, user management, moderation, configuration |

## Data protection

| Data | Protection |
|---|---|
| Passwords | bcrypt, cost factor 12, salted |
| Farm GPS coordinates | AES-256 column-level encryption at rest |
| Financial data | Encrypted at rest; 7-year retention per CBK |
| Diagnosis images | S3 SSE; signed URLs expire in 1 hour |
| Government documents | S3 SSE-KMS; only govt_officer role |
| M-Pesa refs | Never logged in plaintext |
| AI training data | Anonymised before use; no PII |

## Network

- External: TLS 1.3 only (TLS 1.2 permitted for USSD callbacks only)
- Internal: mTLS between services
- API Gateway: WAF rules blocking OWASP Top 10
- Secrets: HashiCorp Vault only — no env files in production
- SSH: WireGuard VPN required — no public SSH port on production VPS
- Containers: non-root users, read-only filesystem, no privileged mode

## KDPA 2019 compliance

- Consent captured at registration with timestamp and version
- Account deletion endpoint (30-day grace period)
- Data export endpoint
- All data stored in Africa (AWS af-south-1)
- Breach notification playbook: OPC within 72 hours
- Age verification at registration; under-18 requires guardian consent
