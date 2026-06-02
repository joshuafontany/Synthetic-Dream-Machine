# ∞ → lar:///grammar.parseuri.defines/parse_uri/
"""
parse_uri.py

Deterministic parser and validator for lar: URIs, enforcing canonical grammar as defined in:
- lares/grammar/uri/LOCI.md
- lares/modules/uri-schema/URI_SCHEMA.md
- lares/modules/uri-schema/URI_SCHEME_SPEC.md
- lares/modules/uri-schema/decide/CONVENTIONS.md
- lares/modules/uri-schema/assess/VERIFICATION.md

Usage:
    python parse_uri.py <uri>
    # Returns PASS/FAIL and error details

This script is intended for use in CI, agent, and batch verification.
"""
import re
import sys

# Canonical regex for lar: URI (record form, authority optional)
#
# ha.ka.ba SINGLE-WORD constraint: each of the three path segments must be one
# unbroken alphanumeric word — no hyphens, no underscores.
# Rationale: ha, ka, ba carry distinct memetic roles (territory, kind, stance).
# A hyphenated segment like "parse-uri" is two words collapsed — that obscures
# which word holds the memetic weight.
#
# TODO(future-me): enforce memetic associations between segments — e.g., verify
# that the ka segment is a recognised kind-word from the grammar registry, that
# ha maps to a known territory, and that ba encodes a valid stance relationship.
# This requires a live registry lookup and is intentionally deferred.
lar_uri_REGEX = re.compile(r'''
^lar://
(?:([a-zA-Z0-9]+:[a-zA-Z0-9]+)@([a-zA-Z0-9]+))?  # authority (optional)
/
([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)    # ha.ka.ba — single words only
(?:/[^?#]*)?                                         # optional subpath
(?:\?([^#]+))?                                       # query (optional)
(?:\#(.+))?                                          # fragment (optional)
$
''', re.VERBOSE)

STANCE_REGEX = re.compile(r'^stances=([\^\-\?\.]{5})$')
CONFIDENCE_REGEX = re.compile(r'^confidence=([A-Z]{1,2}:[0-9]+\.[0-9]+)$')
P_REGEX = re.compile(r'^p=([01](?:\.\d+)?)$')
CHRONOMETER_REGEX = re.compile(r'^(O|Ø|D|A|Å)\d+(\.(O|Ø|D|A|Å)\d+){4}$')


def parse_query(query):
    params = dict()
    if not query:
        return params
    for part in query.split('&'):
        if '=' not in part:
            continue
        k, v = part.split('=', 1)
        params[k] = v
    return params

def validate_lar_uri(uri):
    m = lar_uri_REGEX.match(uri)
    if not m:
        return False, 'URI does not match canonical lar: syntax.'
    authority, host, ha, ka, ba, query, fragment = m.groups()
    # Path must have three slots
    if not (ha and ka and ba):
        return False, 'Path must have three HA.KA.BA slots.'
    # Query params
    params = parse_query(query)
    if params:
        if set(params.keys()) - {'stances', 'confidence', 'p'}:
            return False, f'Unknown query parameters: {set(params.keys()) - {"stances", "confidence", "p"}}'
        if 'stances' in params and not STANCE_REGEX.match(f'stances={params["stances"]}'):
            return False, 'Invalid stances encoding.'
        if 'confidence' in params and not CONFIDENCE_REGEX.match(f'confidence={params["confidence"]}'):
            return False, 'Invalid confidence encoding.'
        if 'p' in params and not P_REGEX.match(f'p={params["p"]}'):
            return False, 'Invalid p encoding.'
    # Fragment
    if fragment:
        if not CHRONOMETER_REGEX.match(fragment):
            return False, 'Fragment must be five dot-separated phase sigils and counters.'
    return True, 'PASS'


def validate_stream_uri(uri):
    """
    Validate a URI for use on the operator stream surface.
    Requires all base canonical rules PLUS stances= query param AND a chronometer fragment.
    """
    ok, msg = validate_lar_uri(uri)
    if not ok:
        return False, msg
    m = lar_uri_REGEX.match(uri)
    assert m is not None  # guaranteed by validate_lar_uri passing
    _, _, _, _, _, query, fragment = m.groups()
    params = parse_query(query)
    if 'stances' not in params:
        return False, 'Operator stream URI requires stances= query parameter.'
    if not fragment:
        return False, 'Operator stream URI requires a chronometer fragment (#O1.Ø2.D3.A4.Å5 form).'
    if not CHRONOMETER_REGEX.match(fragment):
        return False, 'Fragment must be five dot-separated phase sigils and counters.'
    return True, 'PASS'


def main():
    if len(sys.argv) < 2:
        print('Usage: python parse_uri.py <uri>')
        sys.exit(1)
    uri = sys.argv[1]
    ok, msg = validate_lar_uri(uri)
    if ok:
        print(f'[PASS] {uri}')
        sys.exit(0)
    else:
        print(f'[FAIL] {uri}\nReason: {msg}')
        sys.exit(2)

if __name__ == '__main__':
    main()
# → ?
