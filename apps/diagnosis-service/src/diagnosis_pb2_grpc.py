"""
Minimal Python stub for generated gRPC servicer base.

THIS FILE IS A PLACEHOLDER — run `make proto` (scripts/gen_proto.sh) to replace it
with the real protoc-generated output. The real file will be overwritten here.
"""
from __future__ import annotations


class DiagnosisServiceServicer:
    """Base class for DiagnosisService servicer (stub)."""

    async def Diagnose(self, request: object, context: object) -> object:
        raise NotImplementedError("Diagnose not implemented")

    async def GetDiagnosis(self, request: object, context: object) -> object:
        raise NotImplementedError("GetDiagnosis not implemented")


def add_DiagnosisServiceServicer_to_server(
    servicer: object, server: object
) -> None:
    """Register servicer with gRPC server (no-op in stub — real binding happens after `make proto`)."""
