# Skill: Deploy to Contabo VPS

Read this file before any deployment to staging or production.
Reference: `@.claude/skills/deployment/SKILL.md`

## Prerequisites (confirm before starting)

- WireGuard VPN is connected — no public SSH port exists on the VPS
- You have the VPS IP and SSH key path (~/.ssh/agroconnect_prod)
- Docker and Docker Compose v2 are installed on the VPS
- All secrets are in HashiCorp Vault — never in this file or any .env committed to git

## Image tagging convention

```
agroconnect-{service-name}:v{MAJOR}.{MINOR}.{PATCH}
```

Examples:
```
agroconnect-farm-service:v1.2.0
agroconnect-auth-service:v1.2.0
agroconnect-diagnosis-service:v0.4.1
```

Never push or deploy an image tagged `latest` to production.

## Step-by-step deploy workflow

### Step 1 — Run tests locally first
```bash
pnpm turbo run test --filter={service-name}
```
Do not proceed if any test fails.

### Step 2 — Build and tag the image
```bash
docker build -t agroconnect-{service}:v{VERSION} ./apps/{service-name}
```
Verify the build exits with code 0.

### Step 3 — Push to GitHub Container Registry
```bash
docker tag agroconnect-{service}:v{VERSION} ghcr.io/agroconnect/{service}:v{VERSION}
docker push ghcr.io/agroconnect/{service}:v{VERSION}
```
Confirm the digest is returned.

### Step 4 — SSH into the VPS (VPN must be active)
```bash
ssh -i ~/.ssh/agroconnect_prod agroconnect@{VPS_IP}
```

### Step 5 — Pull the new image on the VPS
```bash
docker pull ghcr.io/agroconnect/{service}:v{VERSION}
```
Confirm digest matches Step 3.

### Step 6 — Update image tag in docker-compose.yml on VPS
```bash
sed -i 's|ghcr.io/agroconnect/{service}:v.*|ghcr.io/agroconnect/{service}:v{VERSION}|' \
  /opt/agroconnect/infra/docker-compose.yml
```

### Step 7 — Rolling restart (zero downtime)
```bash
cd /opt/agroconnect
docker compose up -d --no-deps {service-name}
```
`--no-deps` restarts only the target service, not its dependencies.

### Step 8 — Confirm healthy
```bash
docker compose ps {service-name}
```
STATUS must show `healthy`. Wait up to 60 seconds. If still `starting` after 60s, check logs:
```bash
docker compose logs {service-name} --tail 50
```

### Step 9 — Smoke test through Kong
```bash
./scripts/health-check.sh {service-name}
```
This hits the service's `/health` endpoint through the API gateway. Do not mark the deploy complete until this returns 200.

### Step 10 — Tag the release in git
```bash
git tag -a v{VERSION} -m "Deploy {service-name} v{VERSION} to production"
git push origin v{VERSION}
```

## Rollback procedure

```bash
# On the VPS
cd /opt/agroconnect

# Revert compose file to previous version
sed -i 's|{service}:v{NEW}|{service}:v{PREVIOUS}|' infra/docker-compose.yml

# Restart with previous image
docker compose up -d --no-deps {service-name}

# Confirm rollback is healthy
docker compose ps {service-name}
./scripts/health-check.sh {service-name}
```

Notify the team in the #deployments Slack channel after any rollback with the reason and which version is now running.

## PM2 process names (staging only)

| Service | PM2 name |
|---|---|
| auth-service | agroconnect-auth |
| farm-service | agroconnect-farm |
| finance-service | agroconnect-finance |
| market-service | agroconnect-market |
| community-service | agroconnect-community |
| govt-service | agroconnect-govt |
| notification-service | agroconnect-notify |
| media-service | agroconnect-media |
| ussd-service | agroconnect-ussd |
| admin-service | agroconnect-admin |

```bash
pm2 restart agroconnect-{name}
pm2 logs agroconnect-{name} --lines 50
```

## Hard rules

- Never run `docker compose down` on production — it stops all services
- Never deploy directly from a local machine without pushing to GHCR first
- Never edit .env files on the VPS — update Vault, then restart the service
- Never skip the smoke test
- Never deploy on a Friday after 3pm EAT
