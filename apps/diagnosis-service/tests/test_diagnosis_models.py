from __future__ import annotations

from src.models.diagnosis import SubmitDiagnosisRequest


def test_submit_request_allows_zero_images_when_symptoms_present() -> None:
    request = SubmitDiagnosisRequest(
        farm_id="farm-1",
        farmer_id="farmer-1",
        subject_type="plant",
        subject_name="maize",
        image_urls=[],
        symptoms="Leaves turning yellow from the edges",
    )
    assert request.image_urls == []
