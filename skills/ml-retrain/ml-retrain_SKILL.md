# Skill: AI Model Retraining

Read this file before retraining or redeploying the disease detection model.
Reference: `@.claude/skills/ml-retrain/SKILL.md`

## When to retrain

- New disease class added to `@docs/disease-taxonomy.md`
- Farmer feedback data shows accuracy dropping below 85% on any class
- New annotated images available (minimum 500 new images before retraining)
- Scheduled weekly retrain (automated, Sundays 02:00 EAT)

## Step-by-step retrain workflow

### Step 1 — Validate new dataset
```bash
cd apps/diagnosis-service
python scripts/validate_dataset.py --dataset data/new_images/
```

This script checks:
- Minimum 200 images per disease class
- No corrupt or unreadable image files
- All filenames match the disease code format: `{CODE}_{uuid}.jpg`
- No duplicate images (perceptual hash check)
- Image dimensions are at least 224×224px

Fix all validation errors before proceeding. The script exits non-zero on failure.

### Step 2 — Run data augmentation
```bash
python scripts/augment_dataset.py \
  --input data/new_images/ \
  --output data/augmented/ \
  --target-per-class 1000
```

Augmentations applied: random crop, horizontal flip, brightness/contrast jitter, CLAHE enhancement.
This balances class distribution so the model doesn't over-fit common diseases.

### Step 3 — Fine-tune the model
```bash
python train.py \
  --base-model efficientnet-b4 \
  --pretrained models/current/efficientnet_v{VERSION}.h5 \
  --data data/augmented/ \
  --epochs 15 \
  --batch-size 32 \
  --output models/candidate/efficientnet_v{NEW_VERSION}.h5
```

Training runs on the GPU node. Expected time: 45–90 minutes depending on dataset size.
Logs are written to `logs/training_{timestamp}.log`.

### Step 4 — Evaluate the candidate model
```bash
python evaluate.py \
  --model models/candidate/efficientnet_v{NEW_VERSION}.h5 \
  --test-data data/test_set/ \
  --output reports/eval_{NEW_VERSION}.json
```

Open `reports/eval_{NEW_VERSION}.json` and check:

**Deployment gate — all of these must pass:**
- [ ] Overall accuracy ≥ 88%
- [ ] Per-class precision ≥ 75% for all 30 crop diseases
- [ ] Per-class precision ≥ 80% for all 10 livestock conditions
- [ ] No single class has recall < 65% (would miss too many real cases)
- [ ] Inference latency ≤ 2,000ms on CPU (for farmers without GPU inference)

If any gate fails, do not deploy. Review the confusion matrix in the evaluation report, add more training data for the failing classes, and retrain.

### Step 5 — Head of Agronomy approval (required for new disease classes)

If this retrain adds a new disease code to `@docs/disease-taxonomy.md`:
1. Share `reports/eval_{NEW_VERSION}.json` with the Head of Agronomy
2. Get written sign-off (Slack message or email) before Step 6
3. Update `@docs/disease-taxonomy.md` with the new code and details

For accuracy improvements on existing classes, approval is not required.

### Step 6 — Deploy to TensorFlow Serving (A/B deploy)
```bash
# Copy candidate model to staging model registry
python scripts/deploy_model.py \
  --model models/candidate/efficientnet_v{NEW_VERSION}.h5 \
  --env staging \
  --version {NEW_VERSION}

# Confirm TF Serving loaded the model
curl http://localhost:8501/v1/models/disease_detector/versions/{NEW_VERSION}
# Should return: { "version": "{NEW_VERSION}", "state": "AVAILABLE" }
```

Run the full diagnosis integration test against the new version on staging:
```bash
pytest tests/integration/test_diagnosis_pipeline.py -v
```

All tests must pass before production deploy.

### Step 7 — Deploy to production (gradual rollout)
```bash
# Deploy to production TF Serving
python scripts/deploy_model.py \
  --model models/candidate/efficientnet_v{NEW_VERSION}.h5 \
  --env production \
  --version {NEW_VERSION}

# Route 10% of traffic to new model (A/B test)
python scripts/set_model_traffic.py --new-version {NEW_VERSION} --pct 10
```

Monitor for 2 hours:
```bash
# Watch error rate and confidence distribution on new model version
python scripts/monitor_model.py --version {NEW_VERSION} --duration 120
```

If error rate < 0.5% and confidence distribution is healthy, route 100% of traffic:
```bash
python scripts/set_model_traffic.py --new-version {NEW_VERSION} --pct 100
```

### Step 8 — Publish model.deployed Kafka event
```bash
python scripts/notify_model_deploy.py \
  --version {NEW_VERSION} \
  --diseases-count 30 \
  --livestock-count 10 \
  --overall-accuracy {ACCURACY}
```

This publishes a `model.deployed` Kafka event. farm-service consumes it and logs the new model version against future diagnosis records.

### Step 9 — Archive the previous model
```bash
mv models/current/efficientnet_v{OLD_VERSION}.h5 models/archive/
cp models/candidate/efficientnet_v{NEW_VERSION}.h5 models/current/
```

Keep archives for at least 90 days for rollback capability.

### Step 10 — Update version reference
Edit `apps/diagnosis-service/config.py`:
```python
MODEL_VERSION = "v{NEW_VERSION}"
```

Commit, push, and deploy the updated config.

## Rollback procedure

If the new model produces bad diagnoses in production:

```bash
# Immediately route 100% of traffic back to previous version
python scripts/set_model_traffic.py --new-version {OLD_VERSION} --pct 100

# Confirm old version is serving
curl http://tf-serving:8501/v1/models/disease_detector
```

File a post-mortem within 48 hours documenting: what failed, which disease classes, what data was missing, and what needs to change before retrying.

## Dataset naming convention

```
data/
  raw/                          ← unprocessed uploads from farmers/annotators
  annotated/                    ← reviewed by agronomy team, labels confirmed
    {DISEASE_CODE}/
      {DISEASE_CODE}_{uuid}.jpg
  augmented/                    ← generated by augment_dataset.py
  test_set/                     ← held-out evaluation set, never used in training
```

Test set must never be modified or used for training. It is the ground truth for all evaluation.

## What NOT to do

- Never deploy a model that fails the accuracy gate, even temporarily
- Never add a new disease code to the taxonomy without Head of Agronomy approval
- Never use the test_set for training — it must remain unseen by the model
- Never skip the A/B gradual rollout — deploy 100% immediately only for critical bugfixes
- Never delete archived models before 90 days
- Never train on farmer feedback alone without human annotation review — feedback can be wrong
