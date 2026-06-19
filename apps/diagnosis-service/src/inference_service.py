"""
Inference service for crop disease and livestock condition detection.

Mock implementation — images are not examined; a disease is chosen randomly
from the taxonomy matching the subject_type.

REPLACE_WITH_EFFICIENTNET: load model here
  When the real model is ready, load the EfficientNet-v2 SavedModel at module
  level so it is shared across calls:
      import tensorflow as tf
      _MODEL = tf.saved_model.load(settings.MODEL_SERVING_URL)
      _LABEL_MAP = json.loads(Path("label_map.json").read_text())
"""

from __future__ import annotations

import random

from src.models.diagnosis import DiagnosisResult
from src.utils.disease_taxonomy import DISEASE_TAXONOMY, TAXONOMY_BY_CODE

# ---------------------------------------------------------------------------
# Valid code sets — derived exclusively from docs/disease-taxonomy.md.
# Never add codes here that are not in that document.
# ---------------------------------------------------------------------------

VALID_PLANT_CODES: list[str] = [
    d["code"] for d in DISEASE_TAXONOMY if d["subject_type"] == "plant"
]

VALID_ANIMAL_CODES: list[str] = [
    d["code"] for d in DISEASE_TAXONOMY if d["subject_type"] == "animal"
]


def run_inference(
    image_bytes: list[bytes],
    subject_type: str,
    subject_name: str,
) -> DiagnosisResult:
    """
    Return a DiagnosisResult for the given subject.

    image_bytes  -- raw image data (1–5 images from media-service).
    subject_type -- "plant" or "animal".
    subject_name -- e.g. "maize" or "dairy cow".

    REPLACE_WITH_EFFICIENTNET: run inference here
      Replace the random-selection block below with:
          tensors  = [_preprocess(b) for b in image_bytes]
          logits   = _MODEL.signatures["serving_default"](tf.stack(tensors))
          top_idx  = int(tf.argmax(logits["output_0"], axis=-1)[0])
          code     = _LABEL_MAP[top_idx]
          raw_conf = float(tf.reduce_max(logits["output_0"]))
      Then build and return DiagnosisResult from code + raw_conf.
    """
    candidates = VALID_PLANT_CODES if subject_type == "plant" else VALID_ANIMAL_CODES

    code = random.choice(candidates)
    disease = TAXONOMY_BY_CODE[code]

    confidence = round(random.uniform(0.75, 0.97), 4)

    severity_parts = [p.strip() for p in disease["severity_range"].split("-")]
    severity = random.choice(severity_parts)

    return DiagnosisResult(
        disease_name=disease["name"],
        disease_code=disease["code"],
        confidence=confidence,
        severity=severity,
        description=f"{disease['name']} — caused by {disease['pathogen_type']}.",
    )
