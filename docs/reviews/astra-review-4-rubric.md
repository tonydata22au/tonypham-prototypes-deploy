Reviewed [PLAN.md v3.1](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md) and all three previous reviews. **My independent score is 74/100: ready after fixes.** The architecture fits the confirmed decisions; the remaining work is to make its implementation contracts consistent and executable.

This is a document review, not runtime certification. No files changed.

## 1. Rubric

Scores of 2 and 4 interpolate between the anchors. Weighted points = `weight × score ÷ 5`. A blocking correctness or security issue overrides the numerical verdict.

| Criterion | Weight | 1 — weak | 3 — adequate | 5 — strong |
|---|---:|---|---|---|
| Goal and scope clarity | 8 | Outcome and boundaries unclear | Main workflow defined; some ambiguity | Explicit outcomes, constraints, non-goals and availability promise |
| Technical correctness | 22 | Core design cannot work | Viable architecture with unresolved integration details | Internally consistent, version-aware contracts and dependency handling |
| Security | 18 | Exposure or credential controls missing | Sensible controls with material gaps | Explicit trust boundaries, least privilege and negative tests |
| Operability and recovery | 15 | Manual reconstruction or unrecoverable state | Recovery described but incomplete | Reproducible rebuild, rotation, rollback and failure diagnostics |
| Simplicity for one owner | 10 | Excessive infrastructure and custom machinery | Manageable stack with avoidable complexity | Minimal moving parts and deliberately limited operational promises |
| Sequencing and milestones | 8 | Dependencies circular or postponed | Mostly sensible ordering | Each milestone independently executable with clear prerequisites |
| Verifiability | 10 | Aspirational “done” statements | Useful tests with coverage gaps | Positive, negative and failure-path checks with observable results |
| Cost and constraint fit | 4 | Violates confirmed constraints | Fits with unresolved dependencies | Fits private, personal, unpaid operation with explicit fallbacks |
| Agent executability | 5 | Agent must invent major decisions | Detailed outline with ambiguous contracts | Precise inputs, ownership, failure behavior and commands |
| **Total** | **100** | | | |

## 2. Scores

Section references below refer to the current PLAN.md.

| Criterion | Weight | Score | Weighted points | Justification |
|---|---:|---:|---:|---|
| Goal and scope clarity | 8 | 5 | 8.0 | §§1–3, 6 clearly define the workflow, stateless scope, trusted workloads and login-dependent availability. |
| Technical correctness | 22 | 3 | 13.2 | §§7–10 retain CRD configuration, pod admission, schema and rollout-budget gaps. |
| Security | 18 | 4 | 14.4 | §§5–11 establish strong boundaries, but additive Tailscale policy behavior and complete pod settings need explicit treatment. |
| Operability and recovery | 15 | 3 | 9.0 | §§11–14 provide credible recovery stages, but depend on unbacked local metadata and underspecify repeat bootstrap and platform rollback. |
| Simplicity for one owner | 10 | 4 | 8.0 | §§3, 9, 12, 14 wisely defer HA and automated GC; two replicas and several lifecycle promises add unnecessary work. |
| Sequencing and milestones | 8 | 4 | 6.4 | §15 is sensible overall, but M2 manually introduces resources that M3 subsequently claims through Argo. |
| Verifiability | 10 | 4 | 8.0 | §§8–16 contain unusually useful failure tests, but some assertions are inaccurate or omit existing-deployment behavior. |
| Cost and constraint fit | 4 | 5 | 4.0 | §§1, 10, 13 explicitly accommodate unpaid/private operation and procedural merge safeguards. |
| Agent executability | 5 | 3 | 3.0 | §§4, 7, 9, 12 leave enough contradictory or unspecified details that an implementing agent must make consequential decisions. |
| **Total** | **100** | | **74.0** | **Ready after fixes** |

The score does not carry forward the previous reviews’ ratings. Several earlier findings are resolved; the remaining concerns below follow from the current text.

## 3. Evaluation

**Top strengths**

- **Clear, appropriately limited product contract — §§1–3, 6.** Personal, trusted, stateless workloads and downtime during sleep are explicit decisions.
- **Good separation of trusted platform logic and app configuration — §§9–10.** Trusted chart from `main`, exact PR commit for values, derived resource identities, and no arbitrary-manifest escape hatch form a sound design.
- **Useful lifecycle semantics — §§10–12.** Retained branches, explicit purge, digest-based deployment, and deletion diagnostics support predictable everyday use.
- **Recovery is treated as a first-class workflow — §§7, 11, 14.** Restore-before-controller ordering, verified encrypted backups and a declarative drill are substantial improvements.
- **Tests target real integration failures — §§8–9, 16.** Deep links, forwarded-header spoofing, delayed secret reconciliation and reboot recovery are valuable checks.

**Top weaknesses**

- **CRD ownership is named but not fully configured — §7.** Current Envoy documentation requires explicit CRD enablement/channel values; the CRD chart defaults disable both CRD groups. Current controller installation guidance uses `crds.enabled=false`, so `skipCrds` alone is not a version-independent guarantee. [CRD chart values](https://gateway.envoyproxy.io/docs/install/gateway-crds-helm-api/), [installation guidance](https://gateway.envoyproxy.io/docs/install/install-helm/#installing-crds-separately)
- **Two security controls remain incomplete — §§5–6, 9.** Adding a narrow Tailscale grant cannot override broader existing grants. The Deployment specification also omits `allowPrivilegeEscalation: false`, required by Restricted Pod Security. [Tailscale grant semantics](https://tailscale.com/docs/reference/syntax/grants), [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- **Resource limits do not establish rollout feasibility — §9.** “CPU 1, memory 768Mi” does not identify request versus limit quotas. If 768Mi means `limits.memory`, two permitted 512Mi pods already exceed it; even one such pod cannot perform a default surge rollout within that limit. [Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/), [Deployment rolling updates](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)
- **The schema contract is underspecified — §§9–10, 13.** Helm validates merged values, including parameters and the ciphertext file. Closed objects must explicitly accommodate those fields and dynamic maps such as `env`; prose resource ceilings do not define validation of Kubernetes quantity strings. [Helm schema validation](https://helm.sh/docs/topics/charts/#schema-files)
- **Recovery has a hidden local dependency — §§11, 14.** It requires `key-backup.ok`, but the bundle inventory does not include it or equivalent recovery metadata. The drill also restores sensitive sealing/bootstrap material despite claiming real credentials are never duplicated.
- **Bootstrap and milestone ownership conflict — §§4, 7, 14–15.** Bootstrap is called idempotent but contains unconditional `helm install`; upgrade instructions contradict “bootstrap is never re-run”; M2’s manually installed resources lack a handoff.
- **CLI failure behavior is missing — §12.** Worktrees protect the active checkout, but do not define concurrent mutations, partial failures, preservation of existing values, or which commit a readiness check verifies.
- **Some acceptance claims overpromise — §§7, 10, 16.** Helm release metadata does not track subsequent Argo changes. Missing configuration prevents new rendering but does not imply previously deployed resources disappear. [Argo’s Helm lifecycle model](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/)

## 4. Action items for Claude

These are proposed edits to **PLAN.md**, with checks to require during implementation. No additional platform components are necessary.

1. **A1 — P0 — §7: Complete the Envoy CRD installation contract.**  
   **Problem:** Naming a sole owner does not ensure that it renders the required CRDs or that the controller chart renders none.  
   **Exact change:** Specify `crds.gatewayAPI.enabled=true`, `crds.gatewayAPI.channel=standard`, and `crds.envoyGateway.enabled=true` for `gateway-crds-helm`. Require matching pinned Envoy chart versions, `ServerSideApply=true` on the CRD Application, and the pinned controller chart’s supported CRD-disable setting—currently `crds.enabled=false`. Replace the unconditional assertion that `skipCrds` guarantees separation.  
   **Raises:** Technical correctness; agent executability.  
   **Acceptance:** Rendering both pinned charts produces every required CRD exactly once; a clean bootstrap reaches Healthy without duplicate ownership or annotation-size errors. [Official installation procedure](https://gateway.envoyproxy.io/docs/install/install-helm/#installing-crds-separately)

2. **A2 — P0 — §9: State the complete pod security context.**  
   **Problem:** The described Deployment can fail Restricted admission.  
   **Exact change:** Explicitly require `runAsNonRoot: true`, container-level `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]`, `seccompProfile.type: RuntimeDefault`, and the existing read-only filesystem. Require compatible non-root images and define writable `/tmp` behavior. Apply the requirements to every container the chart permits.  
   **Raises:** Security; technical correctness.  
   **Acceptance:** Static, API and worker examples start in an enforced Restricted namespace; a deliberately noncompliant Pod is rejected. [Restricted requirements](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted)

3. **A3 — P0 — §§5–6, 16: Make the Tailscale restriction effective against the whole policy.**  
   **Problem:** “Add an ACL/grant” can leave an existing allow-all rule effective. Grants combine permissions rather than narrowing earlier ones.  
   **Exact change:** Require reviewing the complete existing policy and removing or narrowing every overlapping broad permission to `tag:proto`, while preserving unrelated access. Define the owner selector and tag owner explicitly. Add policy tests for allowed owner HTTPS, denied owner non-443 ports, and denied non-owner access. Keep the firewall fallback conditional on those tests passing.  
   **Raises:** Security; verifiability.  
   **Acceptance:** Policy tests and live probes demonstrate the restrictions, including when starting from a default allow-all policy. [Grant semantics](https://tailscale.com/docs/reference/syntax/grants)

4. **A4 — P0 — §9: Simplify replicas and make quota arithmetic explicit.**  
   **Problem:** Supported resource values, quota shorthand and default surge behavior are not reconciled.  
   **Exact change:** Restrict v1 replicas to `0|1`. Specify web rollout `maxSurge: 1`, `maxUnavailable: 0`; use `Recreate` for workers and document that workers must tolerate restarts. Replace quota shorthand with explicit keys supporting two maximum-sized web pods: `requests.cpu: 500m`, `requests.memory: 512Mi`, `limits.cpu: "2"`, `limits.memory: 1Gi`, plus explicit ephemeral-storage defaults/caps and existing object counts. Retain the ten-app figure as a measured soft target, not guaranteed capacity.  
   **Raises:** Technical correctness; simplicity; operability.  
   **Acceptance:** A maximum-sized web app updates and rotates its secret without quota deadlock; a worker update does not deliberately surge a second worker. [Quota accounting](https://kubernetes.io/docs/concepts/policy/resource-quotas/), [rollout controls](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment)

5. **A5 — P0 — §§9–10, 13: Define validation of the actual merged Helm input.**  
   **Problem:** Closed-schema language does not explain parameters, ciphertext maps or resource quantity validation.  
   **Exact change:** Distinguish the app-file contract from the merged chart schema. Explicitly declare `appName`, `prNumber`, `encryptedData`, and any trusted hostname parameter in the latter. Keep fixed objects closed; allow validated string-valued entries in `env` and `encryptedData`. Specify canonical resource units and render-time range checks, or bounded numeric inputs converted by the chart. State that safety checks run during Argo rendering, independently of CI.  
   **Raises:** Technical correctness; security; agent executability.  
   **Acceptance:** Render fixtures using both real value files and the exact ApplicationSet parameters. Valid examples pass; forbidden fields and excessive quantities fail even without CI. [Helm schema behavior](https://helm.sh/docs/topics/charts/#schema-files)

6. **A6 — P1 — §§11, 14: Make recovery independent of the old Mac’s configuration directory.**  
   **Problem:** `key-backup.ok` is an undocumented recovery prerequisite.  
   **Exact change:** Add a versioned manifest inside the encrypted bundle containing sealing-key fingerprints, backup time, relevant credential-expiry metadata and repository commit. Verify restored keys against that manifest and recreate the local marker only after successful verification. State that the drill duplicates sensitive sealing/bootstrap material but never production application secrets or workers; require cleanup of decrypted temporary material.  
   **Raises:** Operability and recovery; agent executability.  
   **Acceptance:** The drill succeeds with an empty `~/.config/proto`, using only the bundle, age identity, repository and explicitly listed account access.

7. **A7 — P1 — §§4, 7, 14: Define repeat-run bootstrap and version ownership.**  
   **Problem:** Idempotency, Helm handoff and upgrade instructions contradict one another.  
   **Exact change:** Describe bootstrap as a state machine: install Argo only when absent; resume an interrupted initial installation; after adoption, never Helm-upgrade it. Define cluster-stage reruns separately from platform-stage reruns. Replace “Helm shows no drift” with an Argo desired/live comparison. Treat the Gateway API version as a compatibility assertion derived from the selected CRD chart, not another independent installer.  
   **Raises:** Operability; technical correctness; agent executability.  
   **Acceptance:** Fresh, repeated and interrupted bootstrap converge without duplicate installs, overwritten rotated credentials, or a second resource owner. [Argo Helm behavior](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/)

8. **A8 — P1 — §§6–7, 15: Remove the M2-to-M3 ownership handoff.**  
   **Problem:** M2 introduces Envoy before the declared Argo-only ownership model.  
   **Exact change:** Move minimal Argo bootstrap and the Git-managed CRD/Envoy/Gateway Applications into M2. Keep only the disposable smoke-test app hand-applied. Let M3 add Sealed Secrets and the app chart. Move “the full platform returns after reboot” from M1 to the first milestone where the platform exists.  
   **Raises:** Sequencing; simplicity; verifiability.  
   **Acceptance:** Every milestone lists satisfiable prerequisites; no platform component requires an undocumented manual-to-Argo migration.

9. **A9 — P1 — §12: Add a small, deterministic CLI mutation contract.**  
   **Problem:** Retries and competing commands can lose configuration or report success for the wrong revision.  
   **Exact change:** Require a per-app mutation lock; fetch the remote branch tip before editing; preserve existing settings and ciphertext; never force-push; and retry or fail clearly on non-fast-forward pushes. Make deploy retries reuse the branch/PR. Define `--wait` with a bounded timeout that verifies the intended commit/digest and workload readiness; distinguish submission success from readiness. Workers must skip HTTPS checks.  
   **Raises:** Operability; agent executability; verifiability.  
   **Acceptance:** Interrupted deployment can be retried without duplicate PRs; concurrent secret/deploy operations lose no fields; stale Healthy status cannot satisfy a new deployment’s wait.

10. **A10 — P1 — §§3, 9–10, 16: Correct lifecycle assertions and strengthen negative tests.**  
    **Problem:** Several tests cover only fresh installation or imply stronger guarantees than configured.  
    **Exact change:** Replace “draft-only previews” with “CLI-created draft previews” unless draft state is actually enforced. Split missing-values testing into fresh-app and existing-app cases; the latter must report a rendering error and retain the last successfully applied workload. Test both secret-name and namespace binding. For delayed secret rotation, require that the Deployment revision remains unchanged while the controller is stopped, then advances after current-generation unsealing. Add explicit HTTPRoute `Accepted`/`ResolvedRefs` checks.  
    **Raises:** Verifiability; technical correctness.  
    **Acceptance:** Each case names observable states and a timeout; the secret test fails if an early rollout happens to recover later. The upstream health implementation illustrates the necessary generation comparison, but must still be checked against the selected release. [Argo SealedSecret health source](https://github.com/argoproj/argo-cd/blob/master/resource_customizations/bitnami.com/SealedSecret/health.lua)

11. **A11 — P1 — §§6, 11: Remove the auth-key argv contradiction.**  
    **Problem:** Reading a key from stdin and interpolating it into `--auth-key=...` still puts it in process arguments.  
    **Exact change:** Specify Tailscale’s `--auth-key=file:<path>` using a root-only temporary file under `/run`, populated through stdin and removed with a cleanup trap. Disable shell tracing during credential operations and prohibit literal secret arguments in subprocesses.  
    **Raises:** Security; agent executability.  
    **Acceptance:** Process listings and captured bootstrap output contain no credential values; temporary files disappear on both success and failure. [Tailscale file-based auth keys](https://tailscale.com/docs/reference/tailscale-cli/up)

12. **A12 — P1 — §§10, 13–14: Cover shared-chart changes and platform rollback.**  
    **Problem:** Every preview consumes the chart from `main`, but validation only names examples; rollback only covers app digests. A chart edit can therefore affect all active previews simultaneously.  
    **Exact change:** Before merging chart/schema changes, require a local render against retained preview configurations, including paused apps. Keep schema changes backward-compatible during v1. Add a platform rollback procedure using a known-good Git commit, plus a local break-glass procedure for restoring Argo when Argo itself cannot reconcile. State that CRD/K3s downgrades require component-specific compatibility checks.  
    **Raises:** Operability and recovery; verifiability.  
    **Acceptance:** A breaking schema change is caught before merge, and a drill demonstrates recovery from a bad platform configuration without relying exclusively on the broken controller.

## 5. Expected score after fixes

These projections assess the revised **plan**, assuming all P0 and P1 changes above are incorporated with their acceptance checks. They do not imply the checks have passed.

| Criterion | Current | Projected | Projected weighted points |
|---|---:|---:|---:|
| Goal and scope clarity | 5 | 5 | 8.0 |
| Technical correctness | 3 | 4 | 17.6 |
| Security | 4 | 4 | 14.4 |
| Operability and recovery | 3 | 4 | 12.0 |
| Simplicity for one owner | 4 | 5 | 10.0 |
| Sequencing and milestones | 4 | 5 | 8.0 |
| Verifiability | 4 | 5 | 10.0 |
| Cost and constraint fit | 5 | 5 | 4.0 |
| Agent executability | 3 | 5 | 5.0 |
| **Total** | **74/100** | | **89/100** |

**Projected verdict: ready for implementation.** Technical, security and recovery scores remain at 4 until compatible versions are selected and the integration gates have evidence.

*Review limitations:* Canonical guidance was read from its available `toanpham-dev` checkout; the required `toan-ppn-dev` branch could not be selected in this read-only session. The review used the prescribed [Inversion](https://untools.co/inversion/) method and official technical documentation; no cluster, credential or recovery tests were executed.