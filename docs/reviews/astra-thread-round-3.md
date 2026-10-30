**99/100 — one CLI contract clarification remains.** I reread [PLAN.md v5.1](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md) in full and rescored against the unchanged rubric. No files changed; no runtime tests ran.

C6 and C7 are resolved. C8 establishes a durable recovery source, but its new failure message promises a fresh-start behavior that the surrounding rules prohibit.

| Criterion | Weight | Score | Weighted | Justification citing sections |
|---|---:|---:|---:|---|
| Goal and scope clarity | 8 | 5 | 8.0 | §§1–3, 6 explicitly define outcomes, boundaries and availability. |
| Technical correctness | 22 | 5 | 22.0 | §§4.1, 7–10 provide version-aware contracts, renderer version alignment and generation-aware secret ordering. |
| Security | 18 | 5 | 18.0 | §§5–6, 9–11 establish trust boundaries, least privilege and negative tests. |
| Operability and recovery | 15 | 5 | 15.0 | §§4, 7, 11, 14 now consistently separate upgrades, recovery and an isolated drill that stops on invalid configuration. |
| Simplicity for one owner | 10 | 5 | 10.0 | §§3, 9, 14 retain limited operational promises without introducing additional infrastructure. |
| Sequencing and milestones | 8 | 5 | 8.0 | §§6–7, 15 give milestones satisfiable prerequisites and explicit ownership transitions. |
| Verifiability | 10 | 5 | 10.0 | §§9, 12, 16 cover positive, negative and failure paths; controller suspension now includes its parent and cleanup. |
| Cost and constraint fit | 4 | 5 | 4.0 | §§1, 10, 13 preserve private, personal, unpaid operation and local fallbacks. |
| Agent executability | 5 | 4 | 4.0 | §12 still leaves an implementing agent to reconcile “never synthesises config” with the instruction to rerun deploy to start fresh. |
| **Total** | **100** | | **99.0** | **Ready after one clarification** |

**C9 — P2 — §12: Separate first deployment from deleted-branch recovery**

- **Problem:** When files are missing from `main`, the new error instructs the owner to “run proto deploy with `--image/--port` to start fresh.” That can be the command already running. The same paragraph says the CLI never synthesizes configuration, and the expected-outcomes table requires failure without creating a branch. There is no defined condition that makes the suggested retry succeed.
- **Exact change:** Scope the recovery rules explicitly to an app with prior deployment history whose branch was deleted. Replace the missing-files message with:  
  `cannot recover <name>: restore valid values.yaml and secrets.sealed.yaml under apps/<name>/ on main, or deploy under a new name`
  
  Then state:  
  “For a new app with no prior preview PR or branch, deploy initializes values from the supplied arguments and documented chart defaults, with `encryptedData: {}`. The prohibition on synthesizing configuration applies only to recovery of an existing app.”
- **Criterion raised:** Agent executability, from 4/5 to 5/5.
- **Acceptance check:** §12 specifies three distinct outcomes: first deployment initializes configuration; deleted-branch recovery preserves valid configuration from `main`; unrecoverable configuration fails with an instruction that actually changes the prerequisite. Repeating the same command cannot enter a misleading recovery loop.

No runtime evidence is required to resolve this final **plan-quality** point. Deployment acceptance remains subject to the registered tests.

Canonical guidance was freshly read from `toanpham-dev`; the read-only instruction prevented switching to its required branch.

SCORE: 99/100
