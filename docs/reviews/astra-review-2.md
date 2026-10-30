Read [PLAN.md v2](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md). No files changed. “Resolved” below means resolved **in the plan**, not runtime-tested.

**1. Prior findings**

1. **Resolved — PR filters:** branch and target conditions now share one AND filter.
2. **Resolved — Recovery key ordering:** restoration explicitly precedes controller installation.
3. **Resolved — Network boundary:** explicit Lima forwarding, tailnet restrictions, and reachability tests.
4. **Resolved — Platform-value protection:** trusted chart, parameter precedence, closed schema, no `tpl`.
5. **Resolved — `ignoreMissingValueFiles`:** false; both files mandatory, including empty secrets.
6. **Resolved — Gateway filters/headers:** separate redirect/rewrite rules and header replacement.
7. **Resolved — Platform ownership:** bootstrap-to-Argo handoff and ownership map are explicit.
8. **Partially — Credentials:** provisioning is specified; rotated credentials are not explicitly re-backed up.
9. **Resolved — Certificate/key backups:** renewal disabled, verified backups, fingerprint checks, manual rotation.
10. **Partially — Secret rotation:** sound proposed gate, but pinned-version health verification remains pending; namespace ordering introduces another defect below.
11. **Resolved — Private Free-repo merge prevention:** correctly described as procedural, not enforced.
12. **Resolved — Destroy deleting branch:** retention is default; purge is explicit.
13. **Resolved — Tag immutability:** deployments reference resolved digests.
14. **Partially — Startup/Tailscale identity:** login semantics and hostname recovery clarified; an archived auth key cannot guarantee future registration.
15. **Resolved — `./dist` base path:** prebuilt-prefix contract and deep-link tests added.
16. **Resolved — Custom 404:** explicitly deferred; default 404 accepted.
17. **Resolved — Validation timing:** validation now accompanies the relevant milestones.

**2. New issues**

- **Blocker — §9: namespace created too late.** SealedSecret wave −1 runs before the chart-owned Namespace’s default wave 0; fresh secret-bearing deployments fail. Put Namespace at wave −2. Argo sorts by wave before resource kind. [Sync ordering](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/)

- **Major — §7: app-of-apps waves lack readiness gating.** Ordering child Application creation does not establish controller/CRD readiness. Add Application health customization to bootstrap values, or use explicit bootstrap waits. [Argo’s documented requirement](https://argo-cd.readthedocs.io/en/stable/operator-manual/health/#argocd-app)

- **Major — §§7,9: NetworkPolicy assumes Envoy’s namespace.** A Gateway in `gateway` does not place Envoy pods there; the standard deployment puts them alongside the controller. Explicitly set the deployment namespace and match the actual proxy pods. Also replace “apps cannot talk to each other” with “direct ingress is restricted”: open egress permits calls through the shared gateway. [Envoy deployment example](https://gateway.envoyproxy.io/docs/tasks/operations/customize-envoyproxy/)

- **Major — §9: worker health contract is incomplete.** “Omit → TCP probe” breaks workers without listening sockets. Make default probes web-only; workers should omit network probes or provide an explicit suitable check. [Probe semantics](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

- **Major — §§5,11,14: recovery bundle can become stale.** Require refreshed, verified bundles after PAT rotation. Document generating a fresh Tailscale registration key during recovery: auth keys expire within 90 days. Change “bundle alone” to list external prerequisites, including the age identity. [Tailscale expiry](https://tailscale.com/docs/features/access-control/auth-keys)

- **Major — §14: the second-VM drill is not isolated.** Both VMs inherit host port `6443`, while automatic restoration duplicates live workers using real credentials. Parameterize ports, kube contexts, and hostname/header configuration; initially restore only test previews. Never remove the live `proto` identity during a drill.

- **Minor / defer — §§14–15: custom image GC is excessive for v1.** Branch scanning, retention rules, destructive deletion, and rollback-after-GC testing add substantial maintenance. Defer automation until storage pressure exists; keep manual cleanup guidance. If retained, define the rollback window—current branch tips plus five images do not preserve every historical rollback target.

- **Minor — §12: naming contradicts the example.** The regex requires at least two characters, but the CLI example uses `--name x`. Permit single-character names or change the example consistently.

**3. Verdict: ready after fixes — 7/10.**

The architecture can stand. Fix bootstrap ordering and recovery isolation before implementation; defer custom GC.

Review limitation: canonical guidance was read from `toanpham-dev`; the required `toan-ppn-dev` checkout could not be selected in this read-only session.