"""graph_io CONSUMES mempalace's palace_graph + hallways over our OWNED content palace: entity-pair
hallways from the `entities`/`wing` metadata the meta-model consume stamps. No LLM. Proves the
structure/graph meta-model engages on our store once drawers carry entities.

    MEMPALACE_EMBEDDING_MODEL=minilm PYTHONPATH=<repo>/mempalace \
      ~/.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_graph_io.py -q
"""

import json
import os

os.environ.setdefault("MEMPALACE_EMBEDDING_MODEL", "minilm")

import content_io  # noqa: E402
import graph_io  # noqa: E402


def _seed(palace):
    s = content_io.ContentStore(palace)
    # two drawers in one wing sharing the alice;bob entity pair → one hallway (co-occurrence count 2)
    s.put("d1", "alice and bob built the node", [0.1, 0.2], {"wing": "w1", "entities": "alice;bob", "room": "r1"})
    s.put("d2", "alice thanked bob again", [0.3, 0.4], {"wing": "w1", "entities": "alice;bob", "room": "r1"})


def test_hallways_from_entity_cooccurrence(tmp_path):
    palace = str(tmp_path / ".content")
    _seed(palace)
    halls = graph_io.Graph(palace).hallways("w1", min_count=2)
    assert isinstance(halls, list)
    assert len(halls) >= 1                       # the alice-bob co-occurrence materialized a hallway
    json.dumps(halls)                            # the surface serializes


def test_graph_stats_and_build_serialize(tmp_path):
    palace = str(tmp_path / ".content")
    _seed(palace)
    g = graph_io.Graph(palace)
    json.dumps(g.stats())                        # counts serialize
    json.dumps(g.build())                        # {nodes, edges} serialize


def test_empty_wing_no_hallways(tmp_path):
    palace = str(tmp_path / ".content")
    content_io.ContentStore(palace)              # create empty
    assert graph_io.Graph(palace).hallways("nope", min_count=2) == []
