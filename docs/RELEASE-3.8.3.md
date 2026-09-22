# WorkProof Runtime v3.8.3

## Corrective stable release

v3.8.3 carries the post-v3.8.1 network-boundary hardening into the stable distribution and corrects the v3.8.2 container runtime regression discovered by release verification.

## Included

- Studio remains loopback-only by default.
- Non-loopback Studio binding requires an explicit `WORKPROOF_ALLOW_NON_LOOPBACK=1` opt-in.
- Production Compose sets that opt-in only inside the container while publishing the host port on loopback.
- Container runtime and disposable external-topology smokes verify the explicit container binding contract.
- Registry non-loopback binding still requires an explicit authentication policy.
- GitHub Release publication is gated on successful Container workflow verification for the exact release commit.

## v3.8.2 corrective note

v3.8.2 was published before independent Container verification completed and exposed a runtime regression. v3.8.3 adds the corrective runtime contract and closes the release-ordering gap.

## Safety boundary

Public DNS, TLS, production secrets, and a hosted Control Plane remain deployment-time external resources. Direct host-process Studio binding remains loopback-only unless an explicit operator-controlled opt-in is provided.


## Publication evidence

- GitHub Release: `v3.8.3` / ID `393869578`
- release workflow #210: success
- release commit: `27bdec369b3e0664224054471656b3f736e763db`
- GHCR image: `ghcr.io/ahmedsaturki/workproof-runtime:3.8.3`
- GHCR digest: `sha256:ec6f891f8e3fc427937f904eb039d95d58387b1d06261cd91c8c9a886bc7cf67`
- immutable image tag: `27bdec369b3e0664224054471656b3f736e763db`
- Container workflow #207: success
- runtime container smoke: success
- production Compose restart/persistence: success
- disposable external topology: success
- anonymous GHCR pull: success
- rollback verification target: v3.8.1

Release publication was gated on successful Container workflow verification for the exact release commit.
