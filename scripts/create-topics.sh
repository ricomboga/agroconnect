#!/usr/bin/env bash
# Creates all 18 AgroConnect Kafka topics in the dev cluster.
# Run after `docker compose -f infra/docker-compose.dev.yml up -d`
# Usage: bash scripts/create-topics.sh

set -euo pipefail
# Prevent Git Bash on Windows from converting /opt/... paths to Windows paths
export MSYS_NO_PATHCONV=1

BROKER="localhost:9092"
REPLICATION=1
PARTITIONS=3

TOPICS=(
  "user.registered"
  "farm.created"
  "farm.activity.completed"
  "farm.harvest.recorded"
  "diagnosis.submitted"
  "diagnosis.completed"
  "finance.loan.applied"
  "finance.loan.disbursed"
  "finance.payment.confirmed"
  "finance.payment.failed"
  "market.listing.created"
  "market.order.placed"
  "market.order.updated"
  "notification.send"
  "weather.alert.issued"
  "govt.registration.submitted"
  "community.post.created"
  "dead_letter"
)

for TOPIC in "${TOPICS[@]}"; do
  docker exec agroconnect-kafka /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server "$BROKER" \
    --create \
    --if-not-exists \
    --topic "$TOPIC" \
    --replication-factor "$REPLICATION" \
    --partitions "$PARTITIONS" \
    && echo "  [OK] $TOPIC" \
    || echo "  [SKIP] $TOPIC already exists"
done

echo ""
echo "All topics:"
docker exec agroconnect-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server "$BROKER" --list
