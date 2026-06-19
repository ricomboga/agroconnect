# [MOCK] This entire module is a mock implementation.
# Real replacement: implement RealInferenceEngine in real_engine.py,
# then set USE_MOCK_INFERENCE=false in env. No other changes needed.

from __future__ import annotations

import random
from dataclasses import dataclass, field

from src.utils.disease_taxonomy import DISEASE_TAXONOMY, DiseaseEntry


@dataclass
class InferenceResult:
    disease: DiseaseEntry
    confidence: float
    severity: str
    prescriptions: list[dict[str, object]]
    model_version: str
    # [REAL] will also populate alternative_diagnoses from top-3 model outputs
    alternative_diagnoses: list[dict[str, object]] = field(default_factory=list)


# [MOCK] Static prescription templates keyed by pathogen category.
# Real prescriptions come from the agrovet product catalogue via prescription engine.
_PRESCRIPTIONS: dict[str, list[dict[str, object]]] = {
    "fungal": [
        {
            "step": 1,
            "action": "Remove and destroy all visibly infected plant material",
            "product_name": None,
            "product_type": None,
            "dosage": None,
            "frequency": None,
            "agrovet_product_id": None,
        },
        {
            "step": 2,
            "action": "Apply Mancozeb 80WP as a protective and curative spray",
            "product_name": "Mancozeb 80WP",
            "product_type": "fungicide",
            "dosage": "2.5 g per litre of water",
            "frequency": "Every 7 days for 3 applications",
            "agrovet_product_id": None,
        },
    ],
    "bacterial": [
        {
            "step": 1,
            "action": "Uproot and burn infected plants immediately; do not compost",
            "product_name": None,
            "product_type": None,
            "dosage": None,
            "frequency": None,
            "agrovet_product_id": None,
        },
        {
            "step": 2,
            "action": "Drench soil and spray remaining plants with copper oxychloride",
            "product_name": "Copper Oxychloride 50WP",
            "product_type": "bactericide",
            "dosage": "3 g per litre of water",
            "frequency": "Every 10 days, 2 applications",
            "agrovet_product_id": None,
        },
    ],
    "viral": [
        {
            "step": 1,
            "action": "Remove all infected material and burn away from the field",
            "product_name": None,
            "product_type": None,
            "dosage": None,
            "frequency": None,
            "agrovet_product_id": None,
        },
        {
            "step": 2,
            "action": "Apply insecticide to control vector insects spreading the virus",
            "product_name": "Lambda-cyhalothrin 5EC",
            "product_type": "insecticide",
            "dosage": "1 ml per litre of water",
            "frequency": "Every 14 days",
            "agrovet_product_id": None,
        },
    ],
    "insect": [
        {
            "step": 1,
            "action": "Apply emamectin benzoate at first sign of infestation",
            "product_name": "Emamectin Benzoate 1.9EC",
            "product_type": "pesticide",
            "dosage": "0.4 g per litre of water",
            "frequency": "Every 7 days until controlled",
            "agrovet_product_id": None,
        },
        {
            "step": 2,
            "action": "Practice crop rotation to break the pest life cycle",
            "product_name": None,
            "product_type": None,
            "dosage": None,
            "frequency": None,
            "agrovet_product_id": None,
        },
    ],
    "default": [
        {
            "step": 1,
            "action": "Isolate affected animals or plants immediately to prevent spread",
            "product_name": None,
            "product_type": None,
            "dosage": None,
            "frequency": None,
            "agrovet_product_id": None,
        },
        {
            "step": 2,
            "action": "Contact your local extension officer for on-site assessment",
            "product_name": None,
            "product_type": None,
            "dosage": None,
            "frequency": None,
            "agrovet_product_id": None,
        },
    ],
}


def _prescription_key(pathogen_type: str) -> str:
    pt = pathogen_type.lower()
    if "fungal" in pt or "oomycete" in pt:
        return "fungal"
    if "bacterial" in pt:
        return "bacterial"
    if "viral" in pt:
        return "viral"
    if "insect" in pt or "tick" in pt:
        return "insect"
    return "default"


def _pick_severity(severity_range: str) -> str:
    """Return one severity level from a range string like 'moderate-severe'."""
    parts = [p.strip() for p in severity_range.split("-")]
    return random.choice(parts)


class MockInferenceEngine:
    """
    [MOCK] Selects a random disease from the taxonomy matching subject_type.
    Replace with RealInferenceEngine when the EfficientNet model is ready.
    Slot: src/inference/real_engine.py → RealInferenceEngine.run()
    """

    async def run(
        self,
        image_urls: list[str],  # [MOCK] image content is ignored; real engine preprocesses these
        subject_type: str,
        subject_name: str,
    ) -> InferenceResult:
        candidates = [d for d in DISEASE_TAXONOMY if d["subject_type"] == subject_type]
        if not candidates:
            candidates = list(DISEASE_TAXONOMY)

        disease = random.choice(candidates)
        confidence = round(random.uniform(0.75, 0.97), 4)
        severity = _pick_severity(disease["severity_range"])
        key = _prescription_key(disease["pathogen_type"])
        prescriptions = list(_PRESCRIPTIONS[key])  # already exactly 2 entries

        return InferenceResult(
            disease=disease,
            confidence=confidence,
            severity=severity,
            prescriptions=prescriptions,
            model_version="mock-v0",  # [MOCK] real: read from TF Serving metadata response
        )
