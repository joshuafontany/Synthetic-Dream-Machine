"""mempalace-source-lares — declared schema contract for Lares session harvest.

Importing this package registers the adapter in-process (RFC 002 registry), so
`mempalace.sources.registry.get_adapter("lares")` resolves its declared schema
and NDJSON decoder through the `mempalace.sources` entry point.
"""
from .adapter import (
    ADAPTER_NAME,
    ADAPTER_VERSION,
    LAR_SCHEMA,
    LaresAdapter,
    declared_field_names,
)

try:  # in-process registration; harmless if the registry shape ever shifts
    from mempalace.sources.registry import register

    register(ADAPTER_NAME, LaresAdapter)
except Exception:  # noqa: BLE001 — registration is best-effort, declaration still usable
    pass

__all__ = [
    "ADAPTER_NAME",
    "ADAPTER_VERSION",
    "LAR_SCHEMA",
    "LaresAdapter",
    "declared_field_names",
]
