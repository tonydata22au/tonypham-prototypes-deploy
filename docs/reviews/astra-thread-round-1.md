**88/100 — ready after targeted plan corrections.** I rescored [PLAN.md v4.1](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md) from scratch using exactly the nine rubric criteria. No files changed; no runtime tests executed.

**None of the rubric’s 5/5 anchors inherently requires runtime evidence.** They describe plan quality. A complete, consistent plan can reach 100/100 while explicitly reserving deployment acceptance for later tests. The previous review’s blanket withholding of points pending integration evidence was too restrictive.

| Criterion | Weight | Score | Weighted | Justification citing sections |
|---|---:|---:|---:|---|
| Goal and scope clarity | 8 | 5 | 8.0 | §§1–3, 6 explicitly establish outcomes, constraints, non-goals and login-dependent availability. |
| Technical correctness | 22 | 4 | 17.6 | §§4–9 describe credible contracts, but provide no actual version baseline; §§9, 16 also contradict parameter precedence when specifying override rejection. |
| Security | 18 | 5 | 18.0 | §§5–6, 9–11, 16 specify owner-only access, credential handling, Restricted admission, trusted rendering boundaries and negative tests. This meets the planning anchor. |
| Operability and recovery | 15 | 4 | 12.0 | §§7, 11, 14 provide substantial rebuild and rollback procedures, but leave host upgrade execution and recovery revision selection ambiguous. |
| Simplicity for one owner | 10 | 5 | 10.0 | §§1, 3, 9, 14 deliberately limit replicas, persistence, availability and automation. The confirmed stack’s existence alone is not grounds for withholding a point. |
| Sequencing and milestones | 8 | 4 | 6.4 | §15 places Sealed Secrets in M3, whereas §7’s M2 bootstrap completion requires its key and verified backup. M1 also includes an HTTPS success check before M2 supplies the gateway. |
| Verifiability | 10 | 4 | 8.0 | §§9, 16 contain strong observable tests, but trusted-input rejection is specified incorrectly, and the delayed-controller test does not account for Argo restoring the controller. |
| Cost and constraint fit | 4 | 5 | 4.0 | §§1, 10, 13 preserve private, unpaid, personal operation and identify procedural safeguards and local fallbacks. |
| Agent executability | 5 | 4 | 4.0 | §§6, 12, 14 leave consequential choices around host-versus-guest execution, paused deployment waits, and selecting a reusable PR. |
| **Total** | **100** | | **88.0** | **Ready after targeted plan corrections** |

All items below are changes Claude should make to **PLAN.md**, not requests to implement the platform now.

**C1 — P1 — §§4–7, 9, 17: Establish a version-aware baseline**

- **Problem:** “Pinned,” “currently,” and “if the pinned version supports” defer important integration decisions.
- **Exact change:** Add one compact compatibility table containing selected Lima, Ubuntu image, K3s/Kubernetes, Argo chart/application, Sealed Secrets chart/controller, matching Envoy charts, bundled Gateway API, and Tailscale versions. Record the relevant Helm renderer version and local tool constraints. Cite release-specific documentation or source for CRD settings, SealedSecret health semantics and supported Kubernetes versions. Resolve the Namespace restriction choice for that Argo release rather than leaving both branches open. Label the combination **selected, not runtime verified**.
- **Criteria raised:** Technical correctness; agent executability.
- **Acceptance check:** An implementing agent can select artifacts and render settings without choosing versions or interpreting “currently.” Each remaining environmental uncertainty has a named test and explicit fallback or stop condition.
- **5/5 boundary:** Actual compatibility requires later execution. A pinned, cited baseline plus those gates is sufficient evidence of a version-aware **plan**; it does not certify the deployment.

**C2 — P1 — §§4, 6–7, 14: Make upgrade and recovery execution consistent**

- **Problem:** Bootstrap runs inside the VM, yet §§4 and 14 assign Lima upgrades to that command. Recovery records a Git commit but does not say how that commit governs reconstruction versus current `main`.
- **Exact change:** State that Lima installation/upgrades and VM lifecycle run on macOS through `vm-up`; K3s operations run inside the selected guest. Remove the instruction that guest bootstrap upgrades Lima. Define recovery revision selection: validate current `main` against the backed-up baseline before use, or explicitly restore an identified known-good configuration through Git before reconciling. Explain the role of the manifest’s commit and version record, including what happens if credentials have expired.
- **Criteria raised:** Operability and recovery; technical correctness; agent executability.
- **Acceptance check:** A short command sequence identifies host/guest, context, configuration revision and credential source at every step. Reconstruction requires no undocumented files from the lost machine.

**C3 — P1 — §§6–7, 15: Remove forward dependencies from milestone completion**

- **Problem:** M2’s bootstrap requires the Sealed Secrets backup delivered in M3. M1’s acceptance includes functioning HTTPS before M2 establishes its backend.
- **Exact change:** Move Sealed Secrets installation and its first verified backup into M2, alongside the existing platform bootstrap. Leave M3 responsible for the app chart and secret-consuming workload tests. Move successful Serve-to-app HTTPS checks to M2; keep node, private pull, reboot and denied-port checks in M1. State that preview Applications/ApplicationSet are introduced in M4, not required for M2 completion.
- **Criterion raised:** Sequencing and milestones.
- **Acceptance check:** Each milestone’s completion checks reference only artifacts introduced by that milestone or earlier ones. No alternate bootstrap implementation is needed.

**C4 — P1 — §§9, 16: Correct the expected outcomes of negative tests**

- **Problem:** The plan promises rejection of app-file `appName` overrides while also supplying trusted parameters that overwrite those inputs. Helm parameter precedence means the attempted override can disappear before merged-schema validation. [Argo Helm value precedence](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/#helm-value-precedence)
- **Exact change:** Distinguish:
  - Forbidden structural fields such as arbitrary namespace/path/gateway keys: rendering fails.
  - App-file copies of `appName`, `prNumber` or `publicHost`: trusted parameters win; rendered identities remain unchanged. Optional app-file lint may reject these earlier.
  
  For the delayed-controller test, explicitly suspend automated reconciliation of the Sealed Secrets controller Application before scaling it down; restore its original policy and replica count in cleanup. Start the two-minute observation only after Argo has received the changed SealedSecret generation.
- **Criteria raised:** Verifiability; technical correctness.
- **Acceptance check:** Fixtures assert the correct distinction between rejection and harmless overriding. The delayed-controller test proves that the controller remained stopped and that the Deployment stayed unchanged while the new generation awaited unsealing.

**C5 — P1 — §12: Close CLI state ambiguities**

- **Problem:** Deployment preserves existing settings, including `replicas: 0`, but `--wait` always requires Ready pods. PR reuse also assumes every closed PR can be reopened.
- **Exact change:** Declare that deploy preserves pause state. For a paused app, `--wait` verifies the intended revision, digest in the Deployment template, and zero running replicas, then reports **updated, paused** without HTTPS probing. Define PR selection: reuse the open matching PR; otherwise reopen an eligible closed, unmerged PR; if none exists, create one new draft PR. A merged PR is never selected for reopening. On API failure, re-query before attempting creation again.
- **Criterion raised:** Agent executability.
- **Acceptance check:** The plan includes expected outcomes for deploy-to-paused, deploy-after-merge, and interruption after successful PR creation but before the CLI receives its response.

Completing **C1–C5 consistently** would satisfy the remaining 5/5 anchors. No additional platform component is needed. Runtime readiness would still require executing the registered milestone checks; a plan score must not be presented as evidence those checks passed.

Review method: [Inversion](https://untools.co/inversion/), retrieved for this review. Canonical guidance was read from the available `toanpham-dev` checkout; your read-only instruction prevented switching it to required `toan-ppn-dev`.

SCORE: 88/100
