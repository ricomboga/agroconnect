# [REAL — NOT IMPLEMENTED]
# This module will replace MockInferenceEngine when the EfficientNet-v2 model is ready.
#
# Implementation checklist:
#   1. Download images from S3 URLs → decode to numpy arrays
#   2. Resize to (224, 224, 3) and normalise to [-1, 1]
#   3. POST to TF Serving predict endpoint at settings.MODEL_SERVING_URL
#      Endpoint: POST /v1/models/agroconnect_diagnosis:predict
#   4. Map output logit indices to taxonomy codes via label_map.json
#   5. Top-1 → InferenceResult.disease, top-3 → alternative_diagnoses
#   6. Apply settings.MIN_CONFIDENCE — raise InferenceBelowThresholdError if top-1 < threshold
#   7. Set model_version from TF Serving metadata: GET /v1/models/agroconnect_diagnosis
#
# Trigger: set USE_MOCK_INFERENCE=false in .env and wire in get_engine() (engine.py already does this).

from __future__ import annotations

from src.inference.mock_engine import InferenceResult


class InferenceBelowThresholdError(Exception):
    """Raised when top-1 confidence is below settings.MIN_CONFIDENCE."""


class RealInferenceEngine:
    async def run(
        self,
        image_urls: list[str],
        subject_type: str,
        subject_name: str,
    ) -> InferenceResult:
        raise NotImplementedError(
            "RealInferenceEngine is not implemented. "
            "Set USE_MOCK_INFERENCE=true to use the mock engine."
        )
