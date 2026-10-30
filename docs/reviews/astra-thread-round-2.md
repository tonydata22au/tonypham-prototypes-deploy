**94/100 — ready after three remaining corrections.** I reread [PLAN.md v5](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md) and rescored from scratch. No files changed; no cluster tests ran.

C1 and C3 are resolved. C2, C4 and C5 are substantially addressed, with the residual issues below.

| Criterion | Weight | Score | Weighted | Justification citing sections |
|---|---:|---:|---:|---|
| Goal and scope clarity | 8 | 5 | 8.0 | §§1–3, 6 retain explicit outcomes, constraints, non-goals and availability limits. |
| Technical correctness | 22 | 5 | 22.0 | §§4.1, 7–10 now establish a supported version baseline, generation-aware secret ordering, and correct input-precedence expectations. |
| Security | 18 | 5 | 18.0 | §§5–6, 9–11 specify trust boundaries, least privilege, credential handling and negative tests; Namespace name restrictions are now version-backed. |
| Operability and recovery | 15 | 4 | 12.0 | §14 retains the old Lima upgrade instruction; its drill also inherits a recovery step that can modify live `main`, contradicting isolation. |
| Simplicity for one owner | 10 | 5 | 10.0 | §§3, 9, 14 retain limited operational promises and avoid additional services or controllers. |
| Sequencing and milestones | 8 | 5 | 8.0 | §§6–7, 15 resolve the M1 HTTPS and M2 backup dependencies; previews explicitly arrive in M4. |
| Verifiability | 10 | 4 | 8.0 | §§9, 16 correct rejection-versus-precedence tests, but controller suspension remains vulnerable to parent reconciliation. |
| Cost and constraint fit | 4 | 5 | 4.0 | §§1, 10, 13 preserve private, unpaid operation and local validation fallbacks. |
| Agent executability | 5 | 4 | 4.0 | §12 fixes paused waits and merged-PR selection, but “last values on record” introduces an undefined recovery source. |
| **Total** | **100** | | **94.0** | **Ready after corrections** |

**Independent version verification**

- Confirmed Argo chart **10.11.6 → v3.5.6** and Sealed Secrets chart **2.22.0 → 0.41.2** from their tagged chart files. [Argo chart](https://github.com/argoproj/argo-helm/blob/argo-cd-10.11.6/charts/argo-cd/Chart.yaml), [Sealed Secrets chart](https://github.com/bitnami-labs/sealed-secrets/blob/helm-v2.22.0/helm/sealed-secrets/Chart.yaml).
- Confirmed Envoy Gateway **1.9 → Gateway API 1.6.1**, with Kubernetes **1.33–1.36**; Argo 3.5 documents that same Kubernetes range. [Envoy matrix](https://gateway.envoyproxy.io/news/releases/matrix/), [Argo tested versions](https://github.com/argoproj/argo-cd/blob/v3.5.6/docs/operator-manual/tested-kubernetes-versions.md).
- Confirmed Argo v3.5.6 supports cluster-resource name restrictions, and its built-in SealedSecret check does **not** compare generations. The override is justified. [Project documentation](https://github.com/argoproj/argo-cd/blob/v3.5.6/docs/user-guide/projects.md), [health implementation](https://github.com/argoproj/argo-cd/blob/v3.5.6/resource_customizations/bitnami.com/SealedSecret/health.lua).
- Confirmed the Lima autostart command and Ubuntu template, K3s release tag, and Tailscale stable version. [Lima autostart](https://lima-vm.io/docs/usage/autostart/), [Ubuntu template](https://github.com/lima-vm/lima/blob/v2.2.1/templates/ubuntu-26.04.yaml), [K3s release](https://github.com/k3s-io/k3s/releases/tag/v1.36.5%2Bk3s1), [Tailscale package metadata](https://pkgs.tailscale.com/stable/?mode=json).
- **Clarification:** Argo v3.5.6’s build specifies Helm **4.2.1**, whereas local validation selects **4.3.1**. This passes the stated major-version gate, but is not exact renderer parity. Record that distinction; using 4.2.1 locally would simplify reproducibility. [Argo tool versions](https://github.com/argoproj/argo-cd/blob/v3.5.6/hack/tool-versions.sh).

These checks establish source-backed selections, not tested deployment compatibility.

**C6 — P1 — §§4, 14: Finish the upgrade correction and preserve drill isolation**

- **Problem:** §14 still says to upgrade both Lima and K3s through `bootstrap --stage cluster`. More significantly, the drill inherits recovery step 1, which can revert and push live `main` if validation fails.
- **Exact change:** Replace §14’s upgrade sentence with the host/guest split already defined in §4. Explicitly state that the drill never modifies `main`: if its selected configuration fails validation, stop and report the failure. Keep live-recovery repair of `main` exclusively in the real-recovery procedure. Qualify §4’s “Bootstrap never touches … in-cluster components” as “after initial installation and ownership handoff.”
- **Criterion raised:** Operability and recovery.
- **Acceptance check:** A walkthrough with deliberately invalid `main` makes the drill stop without a Git write or live-cluster change. Every Lima operation is assigned to macOS, every K3s operation to the guest.
- **To earn 5/5:** The plan must contain that consistent upgrade procedure and an isolation-preserving failure path.

**C7 — P1 — §9: Suspend the parent before suspending its child**

- **Problem:** Disabling auto-sync on `sealed-secrets` alone does not prevent `root` from restoring the Git-managed child Application specification. Argo self-healing can reconcile live changes back to Git. [Automated synchronization](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/).
- **Exact change:** Before the delayed-controller test, capture both Applications’ original policies, disable auto-sync on `root`, wait for any running root sync to finish, then disable it on `sealed-secrets` and stop the controller. Keep the preview Application reconciling. Cleanup restores controller replicas and the child policy first, then restores the root policy. Assert both suspensions remain effective throughout the observation window.
- **Criterion raised:** Verifiability.
- **Acceptance check:** The controller remains stopped across multiple reconciliation intervals while the updated SealedSecret is applied; cleanup restores both original policies even after a failed assertion.
- **To earn 5/5:** The test must control the complete reconciliation chain, with observable assertions and cleanup. Executing it belongs to implementation acceptance.

**C8 — P2 — §12: Define the source for a deleted preview branch**

- **Problem:** “Recreated from the last values on record” identifies neither a durable source nor behavior when that source is missing. An implementing agent must invent recovery semantics.
- **Exact change:** Prefer the simpler rule: when a merged preview’s branch is gone, recreate it from current `main` only if `apps/<name>/values.yaml` and `secrets.sealed.yaml` exist and validate. Otherwise fail with a precise recovery instruction; do not silently synthesize configuration or recover from an unspecified local cache.
- **Criterion raised:** Agent executability.
- **Acceptance check:** The plan defines deterministic results for a deleted branch with valid merged files, missing files, and invalid files, without losing ciphertext or other settings.
- **To earn 5/5:** Inputs, source selection and failure behavior must be explicit.

No remaining criterion requires runtime evidence to earn full **plan-quality** marks. Applying C6–C8 consistently would satisfy the remaining anchors.

Canonical guidance remains on `toanpham-dev`; I preserved it under the read-only instruction.

SCORE: 94/100
