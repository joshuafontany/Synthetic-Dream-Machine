#!/usr/bin/env python3
"""capture_wal — the durable source-side reserve: a crash-sound WAL + quarantine (stdlib only).

Makes a NON-REPLAYABLE stream replayable: every record appends durable BEFORE it enters
the hot path, boot replays the intact prefix into the same idempotent pass the durable
sources already ride, and compaction rotates only after the commit watermark confirms
the real store holds everything. The py capture law (re-run the pass from a durable
source) extends to live streams without changing shape.

The pattern-integrities, each one earned from the literature (Log-Keeper handback):

  · FRAME + CRC, never bare NDJSON. A torn append can persist size before bytes and
    leave parseable garbage (ALICE, OSDI'14; Kafka names the same case) — parse-failure
    skipping converts torn tails, mid-file garbage, and bit rot alike into SILENT loss.
    Frame = MAGIC(1) + len u32 LE + crc32 u32 LE + payload (UTF-8 JSON): boundaries
    never depend on payload bytes, and "invalid" becomes detectable.
  · SYNC BEFORE ACK. A successful write() promises nothing past the page cache
    (write(2) NOTES); fdatasync before the record enters the hot pool — on Linux it
    still flushes the size metadata an append needs (fsync(2)).
  · SINGLE WRITER, LOUD. POSIX grants no interleaving atomicity to concurrent
    appends; parallel operator sessions run in this house. An exclusive flock on
    <dir>/LOCK, held for the process lifetime; a second writer refuses LOUD.
  · PREFIX-VALID REPLAY. Powersafe-overwrite bounds crash damage to the appended
    region (SQLite PSOW), so replay yields the valid prefix and stops at the first
    invalid frame — a torn TAIL reads as normal truncation. Valid frames FOUND PAST
    an invalid one name mid-log corruption: the segment moves whole into quarantine
    and the alarm raises after the valid prefix has been yielded — never a silent skip.
  · ROTATE, NEVER TRUNCATE. compact() = new segment + fsync(file) + fsync(dir) +
    swap + unlink old + fsync(dir) — every crash point leaves either the old fully
    replayable segment or both (the content-keyed sink dedups a double replay).
  · AT-LEAST-ONCE + the idempotent sink = the whole correctness story (Kafka and
    Postgres both recover exactly this way); the WAL owes order within a segment and
    generation-order across them, nothing more.

The WAL dir belongs INSIDE the ext4 VHD (never /mnt/c — 9p breaks flock and speed);
the honest durability line on WSL2 ends at the VHD boundary (host-cache flush
semantics stand undocumented — an open question, not a promise).

Meme: lar:///ha.ka.ba/lararium/capture/wal-reserve
"""
from __future__ import annotations

import json
import os
import re
import struct
import zlib

MAGIC = 0x57  # 'W' — one byte of frame header the payload can never fake cheaply
_HEADER = struct.Struct("<BII")  # magic, payload length, crc32(payload)
#: a frame length past this reads as garbage, never as a record (capture records run small)
MAX_FRAME_BYTES = 8_000_000

_SEGMENT_RE = re.compile(r"^wal\.(\d{6})$")
_sync = getattr(os, "fdatasync", os.fsync)


class WalLocked(SystemExit):
    """A second writer on one WAL dir — refused LOUD, never an interleaved log."""


class MidLogCorruption(RuntimeError):
    """Valid frames stand PAST an invalid one — not a torn tail. The segment has been
    moved whole into quarantine; the valid prefix already replayed. Surfaced, never skipped."""


def pack_frame(record: dict) -> bytes:
    payload = json.dumps(record, sort_keys=True).encode("utf-8")
    return _HEADER.pack(MAGIC, len(payload), zlib.crc32(payload)) + payload


def _frame_at(data: bytes, pos: int) -> "tuple[dict, int] | None":
    """The record at pos and the next offset — or None where no valid frame stands."""
    end = pos + _HEADER.size
    if end > len(data):
        return None
    magic, length, crc = _HEADER.unpack_from(data, pos)
    if magic != MAGIC or length > MAX_FRAME_BYTES or end + length > len(data):
        return None
    payload = data[end : end + length]
    if zlib.crc32(payload) != crc:
        return None
    try:
        return json.loads(payload.decode("utf-8")), end + length
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def _valid_frame_past(data: bytes, pos: int) -> bool:
    """Whether ANY valid frame stands past pos — the torn-tail vs mid-log-corruption test."""
    probe = data.find(bytes([MAGIC]), pos + 1)
    while probe != -1:
        if _frame_at(data, probe) is not None:
            return True
        probe = data.find(bytes([MAGIC]), probe + 1)
    return False


def _fsync_dir(path: str) -> None:
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


class CaptureWal:
    """The reserve over one WAL dir: append (durable-before-ack) · replay (prefix-valid,
    generation order) · compact (rotate after the watermark) · quarantine (dead letters,
    never replayed). One writer per dir, enforced at open."""

    def __init__(self, wal_dir: str) -> None:
        self.dir = os.path.expanduser(wal_dir)
        os.makedirs(self.dir, exist_ok=True)
        # single-writer law: the flock holds for the process lifetime
        self._lock_fd = os.open(os.path.join(self.dir, "LOCK"), os.O_CREAT | os.O_RDWR)
        import fcntl

        try:
            fcntl.flock(self._lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            os.close(self._lock_fd)
            raise WalLocked(
                f"capture_wal: another writer holds {self.dir!r} — two writers "
                "interleave frames and neither notices. One WAL dir, one process."
            )
        self._gen = max(self._generations(), default=1)
        self._fd = self._open_segment(self._gen)

    # ── segments ─────────────────────────────────────────────────────────────

    def _generations(self) -> "list[int]":
        out = []
        for name in os.listdir(self.dir):
            m = _SEGMENT_RE.match(name)
            if m:
                out.append(int(m.group(1)))
        return sorted(out)

    def _segment_path(self, gen: int) -> str:
        return os.path.join(self.dir, f"wal.{gen:06d}")

    def _open_segment(self, gen: int) -> int:
        path = self._segment_path(gen)
        existed = os.path.exists(path)
        fd = os.open(path, os.O_APPEND | os.O_CREAT | os.O_WRONLY)
        os.fsync(fd)
        if not existed:
            _fsync_dir(self.dir)  # the creation itself must survive the crash
        return fd

    # ── the four verbs ───────────────────────────────────────────────────────

    def append(self, record: dict) -> None:
        """One assembled frame, one os.write, one fdatasync — durable BEFORE the caller
        proceeds. The ack this returns is the only durability promise the hot path holds."""
        frame = pack_frame(record)
        os.write(self._fd, frame)
        _sync(self._fd)

    def replay(self):
        """Yield every intact record, segments in generation order, frames in file order —
        at-least-once into the content-keyed sink. A torn tail truncates quietly (its byte
        count reported via `self.last_truncated`); valid frames past an invalid one move
        the segment whole into quarantine and raise MidLogCorruption AFTER the valid
        prefix has been yielded — consume the generator fully."""
        self.last_truncated = 0
        for gen in self._generations():
            path = self._segment_path(gen)
            with open(path, "rb") as fh:
                data = fh.read()
            pos = 0
            while True:
                hit = _frame_at(data, pos)
                if hit is None:
                    break
                record, pos = hit
                yield record
            if pos < len(data):
                if _valid_frame_past(data, pos):
                    branded = os.path.join(
                        self.dir, f"quarantine.midlog.wal.{gen:06d}"
                    )
                    os.replace(path, branded)
                    _fsync_dir(self.dir)
                    raise MidLogCorruption(
                        f"capture_wal: valid frames stand past an invalid one at byte "
                        f"{pos} of {path!r} — mid-log corruption, never a torn tail. "
                        f"The segment moved whole to {branded!r}; the valid prefix "
                        "replayed; the rest awaits the operator's eye."
                    )
                self.last_truncated += len(data) - pos

    def compact(self) -> None:
        """Rotate once the commit watermark confirms the store holds everything replayed:
        new segment (fsync file + dir) → swap the writer → unlink the old → fsync dir.
        Every crash point leaves a replayable picture; nothing truncates in place."""
        old_gen, old_fd = self._gen, self._fd
        self._gen = old_gen + 1
        self._fd = self._open_segment(self._gen)
        _fsync_dir(self.dir)
        os.close(old_fd)
        old_path = self._segment_path(old_gen)
        if os.path.exists(old_path):
            os.unlink(old_path)
            _fsync_dir(self.dir)

    def quarantine(self, records: "list[dict]") -> None:
        """Dead-letter a poison batch — same frame format, same sync discipline, its own
        file (`quarantine.wal`), never replayed, never compacted, never auto-drained."""
        fd = os.open(
            os.path.join(self.dir, "quarantine.wal"),
            os.O_APPEND | os.O_CREAT | os.O_WRONLY,
        )
        try:
            for rec in records:
                os.write(fd, pack_frame(rec))
            _sync(fd)
        finally:
            os.close(fd)

    def close(self) -> None:
        os.close(self._fd)
        os.close(self._lock_fd)
