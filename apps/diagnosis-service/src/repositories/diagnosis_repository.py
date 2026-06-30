from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.inference.mock_engine import InferenceResult
from src.models.diagnosis import DiagnosisDocument, FarmerFeedback

log = structlog.get_logger(__name__)


def _to_model(doc: dict[str, Any]) -> DiagnosisDocument:
    doc["id"] = str(doc.pop("_id"))
    return DiagnosisDocument.model_validate(doc)


def _object_id(diagnosis_id: str) -> ObjectId:
    try:
        return ObjectId(diagnosis_id)
    except InvalidId as exc:
        raise ValueError(f"Invalid diagnosis_id: {diagnosis_id!r}") from exc


class DiagnosisRepository:
    def __init__(self, db: AsyncIOMotorDatabase) -> None:  # type: ignore[type-arg]
        self._col = db["diagnoses"]

    async def create_pending(
        self,
        farm_id: str,
        farmer_id: str,
        subject_type: str,
        subject_name: str,
        image_urls: list[str],
    ) -> str:
        now = datetime.now(timezone.utc)
        doc: dict[str, Any] = {
            "farm_id": farm_id,
            "farmer_id": farmer_id,
            "subject_type": subject_type,
            "subject_name": subject_name,
            "image_urls": image_urls,
            "ai_model_version": "",
            "diagnosis": None,
            "alternative_diagnoses": [],
            "prescriptions": [],
            "farmer_feedback": None,
            "status": "pending",
            "processing_time_ms": None,
            "created_at": now,
            "updated_at": now,
        }
        result = await self._col.insert_one(doc)
        diagnosis_id = str(result.inserted_id)
        log.info("diagnosis created", diagnosis_id=diagnosis_id, farm_id=farm_id)
        return diagnosis_id

    async def update_completed(
        self,
        diagnosis_id: str,
        result: InferenceResult,
        elapsed_ms: int,
    ) -> None:
        d = result.disease
        now = datetime.now(timezone.utc)
        await self._col.update_one(
            {"_id": _object_id(diagnosis_id)},
            {
                "$set": {
                    "status": "completed",
                    "ai_model_version": result.model_version,
                    "diagnosis": {
                        "disease_name": d["name"],
                        "disease_code": d["code"],
                        "confidence": result.confidence,
                        "severity": result.severity,
                        "description": f"{d['name']} — caused by {d['pathogen_type']}.",
                        "affected_area": None,
                    },
                    "alternative_diagnoses": result.alternative_diagnoses,
                    "prescriptions": result.prescriptions,
                    "processing_time_ms": elapsed_ms,
                    "updated_at": now,
                }
            },
        )

    async def update_processing(self, diagnosis_id: str) -> None:
        await self._col.update_one(
            {"_id": _object_id(diagnosis_id)},
            {"$set": {"status": "processing", "updated_at": datetime.now(timezone.utc)}},
        )

    async def update_failed(self, diagnosis_id: str) -> None:
        await self._col.update_one(
            {"_id": _object_id(diagnosis_id)},
            {"$set": {"status": "failed", "updated_at": datetime.now(timezone.utc)}},
        )

    async def find_by_id(self, diagnosis_id: str) -> DiagnosisDocument | None:
        try:
            oid = _object_id(diagnosis_id)
        except ValueError:
            return None
        doc = await self._col.find_one({"_id": oid})
        return _to_model(doc) if doc else None

    async def find_by_farm(
        self,
        farm_id: str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[DiagnosisDocument]:
        cursor = (
            self._col.find({"farm_id": farm_id})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        return [_to_model(doc) async for doc in cursor]

    async def count_by_farm(self, farm_id: str) -> int:
        return await self._col.count_documents({"farm_id": farm_id})

    async def update_feedback(
        self,
        diagnosis_id: str,
        feedback: FarmerFeedback,
    ) -> None:
        await self._col.update_one(
            {"_id": _object_id(diagnosis_id)},
            {
                "$set": {
                    "farmer_feedback": feedback.model_dump(mode="json"),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
