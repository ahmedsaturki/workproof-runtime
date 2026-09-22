# Portable Proof Bundle

WorkProof portable proof is a dependency-free directory format for moving a proof result outside the running Studio.

## Contents

- `proof.json`: the original proof payload, including its existing integrity metadata and optional signature. It is copied byte-for-byte and is never rewritten by export/import.
- `manifest.json`: format, work identity, proof digest, proof file SHA-256/size, and artifact sidecar mappings.
- `artifacts/<sha256>`: local artifact bytes copied from proof `file://` references.

Remote/non-local artifact references remain descriptive references in the proof and are recorded as non-portable entries in the manifest rather than being silently omitted.

## Workflow

```bash
workctl proof-export proof.json ./portable-bundle
workctl proof-bundle-verify ./portable-bundle
workctl proof-import ./portable-bundle ./imported-proof
workctl verify ./imported-proof/proof.json
```

The bundle verifier independently checks the proof integrity, optional Ed25519 signature, manifest identity, proof file digest, and every included artifact digest.

Import is materialization only: the proof payload and signature are preserved exactly. This avoids changing the signed payload during transport.

The format is intentionally filesystem-based so it works without an extra archive or cloud dependency. A later release may add archive adapters over the same manifest contract.
