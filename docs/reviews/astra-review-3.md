Read [PLAN v3](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md) fully; no files modified. “Resolved” below means resolved **in the plan**, pending implementation tests.

| Issue | Status | Assessment |
|---|---|---|
| Review #2 — 1. Namespace ordering | **Resolved** | Namespace −2 → SealedSecret −1 → Deployment 0. |
| 2. App-of-apps readiness | **Resolved** | Application health customization explicitly required in bootstrap values. |
| 3. NetworkPolicy / Envoy namespace | **Resolved** | Uses `envoy-gateway-system` plus proxy labels, verified at M2. |
| 4. Worker probes | **Resolved** | No probes unless an exec check is supplied. |
| 5. Recovery bundle / auth-key expiry | **Resolved** | Backup after rotation; fresh Tailscale key and replacement PAT prerequisites documented. |
| 6. Drill isolation | **Partial** | Separate VM/context/hostname fixed; reconciliation-safe configuration remains unspecified. |
| 7. Defer image GC | **Resolved** | Automated GC explicitly excluded. |
| 8. Name regex / example | **Resolved** | Current examples match the shared regex. |
| Review #1 — #8 | **Unverified** | Original finding unavailable. |
| Review #1 — #10 | **Unverified** | Original finding unavailable. |
| Review #1 — #14 | **Unverified** | Original finding unavailable. |

I requested the missing three descriptions rather than invent their numbering.

**Remaining major issues:**

- **Drill configuration must survive reconciliation.** [§14](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md:492) specifies patching the ApplicationSet, but its Git-managed owner can restore `deploy`, potentially launching live workloads in the drill. Use a dedicated declarative drill overlay/source **before the first sync**, including its hostname and selector; assert isolation after repeated reconciliation. This follows [Argo’s reconciliation behavior](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/#automatic-self-healing).
- **Make CRD ownership explicit.** [§7](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md:189) separately installs Gateway API CRDs, while Envoy’s default chart also supplies them. Specify one owner for Gateway API **and Envoy extension CRDs**, and disable duplicate rendering in the controller chart using the pinned version’s supported settings. Otherwise the two Applications can manage conflicting copies. [Envoy installation guidance](https://gateway.envoyproxy.io/docs/install/install-helm/#installing-crds-separately).

**Verdict: ready after fixes — 8/10**, provisional until the three review #1 findings are identified. Neither remaining issue prevents starting M1.

Claude’s first three M1 actions:

1. Create the skeleton and select compatible, explicit version pins.
2. Implement idempotent VM/cluster bootstrap with instance/context parameters, no mounts, localhost-only API forwarding, and secure credential handling.
3. Prove private image pulls, repeat-run safety, reboot/login recovery, and LAN/tailnet port isolation; record results before adding platform components.

Guidance limitation: its checkout is on `toanpham-dev`; this read-only session could not switch it to required `toan-ppn-dev`.