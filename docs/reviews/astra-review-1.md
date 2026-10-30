Reviewed [docs/PLAN.md](/Users/tony.pham/Downloads/tonypham-prototypes-deploy/docs/PLAN.md) without modifying files. The architecture is workable, but the plan contains two blockers and several integration gaps. This is a document review against official documentation; no cluster tests were run.

1. **Blocker — §10: PR filters implement OR instead of AND.**  
   Separate `filters` entries are alternatives. Consequently, any labelled PR targeting `main` qualifies, even without a valid `preview/<app>` branch; a matching preview branch targeting another branch also qualifies. This can produce unintended or invalid Applications.  
   **Claude action:** Put both conditions in one filter:
   ```yaml
   filters:
     - branchMatch: "^preview/[a-z0-9]([-a-z0-9]{0,30}[a-z0-9])?$"
       targetBranchMatch: "^main$"
   ```
   Add negative tests for both mismatches. The `.branch`, `.number`, `.head_sha` fields and `trimPrefix "preview/" .branch` with `goTemplate: true` are valid. [PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/), [Go templates](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/).

2. **Blocker — §§7, 14: Recovery ordering contradicts bootstrap.**  
   Recovery runs full bootstrap, which starts Sealed Secrets and Argo, then claims to restore keys before controller startup.  
   **Claude action:** Split recovery into explicit stages: create VM/K3s → restore all sealing keys and bootstrap credentials → start controllers → enable reconciliation. Alternatively, document restoring keys into a running installation followed by controller restart. Validate the backup before deleting the original VM; preferably prove restoration in a separate disposable VM first. [Sealed Secrets recovery](https://github.com/bitnami/sealed-secrets#how-can-i-do-a-backup-of-my-sealedsecrets).

3. **Major — §§6–8, 16: “Tailscale only” is not yet an enforced network boundary.**  
   ServiceLB uses host ports; it does not establish loopback-only exposure. `vmType: vz` also does not specify the network mode. Serve protects its endpoint, not alternative access through VM addresses, forwarded ports, or NodePorts. The assumed `127.0.0.1:80` path needs testing with the selected K3s networking configuration.  
   **Claude action:** Specify Lima networking, explicit port-forward rules, guest firewall rules, and tailnet access policy. Install and enable `tailscaled` explicitly. At M2, prove loopback connectivity, then test blocked direct access to VM HTTP/NodePorts/API from unauthorized interfaces and devices. [ServiceLB](https://docs.k3s.io/networking/networking-services), [Lima networking](https://lima-vm.io/docs/config/network/), [Serve](https://tailscale.com/docs/reference/tailscale-cli/serve).

4. **Major — §§9–10: Claimed platform-value protection exceeds the implementation shown.**  
   The sketch pins only `appName` and `prNumber`; it does not pin `namespace`, `basePath`, or the Gateway reference. Helm parameter precedence is correctly described, but only protects parameters actually supplied. Additionally, allowing cluster-scoped `Namespace` does not by itself restrict Namespace names through destination `app-*`.  
   **Claude action:** Derive namespace/path from the protected app name inside the trusted chart, and hard-code or parameterize the Gateway reference. Prohibit arbitrary manifests, metadata overrides, and `tpl` evaluation of app-supplied values. Specify exact AppProject group/kind allowlists and, where supported by the pinned Argo version, `Namespace` name restriction `app-*`. Test attempted namespace/path/Gateway overrides. [Helm precedence](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/), [AppProject restrictions](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/).

5. **Major — §10: Missing required app configuration is silently tolerated.**  
   `$values` with `ref: values`, no `path`, and `.head_sha` is correct. However, `ignoreMissingValueFiles: true` ignores both the optional secrets file and required `values.yaml`. A typo or deletion can render chart defaults instead of failing closed.  
   **Claude action:** Prefer creating `secrets.sealed.yaml` as `{encryptedData: {}}` for every app and disable missing-file tolerance. Otherwise, enforce mandatory app fields without usable defaults and test missing configuration explicitly. [Multiple sources](https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/), [Missing values files](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/).

6. **Major — §8: The routing contract needs executable Gateway API details.**  
   `URLPrefixRewrite` is not the filter name: use `URLRewrite` with `path.type: ReplacePrefixMatch`. Redirect and rewrite filters cannot coexist in one rule. Prefix rewriting does not automatically establish `X-Forwarded-Prefix`, fix application redirects, or guarantee the backend sees HTTPS after the HTTP proxy hop.  
   **Claude action:** Specify separate exact-path redirect and prefix-routing rules. Set redirect scheme/port explicitly to HTTPS/443; explicitly set `X-Forwarded-Prefix` and define trusted handling of `X-Forwarded-Proto`. Test `/app`, `/app/`, nested paths, query strings, POST behavior, backend redirects, and spoofed forwarded headers. Document application proxy/base-path configuration. [Gateway redirects and rewrites](https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/), [Envoy rewrite](https://gateway.envoyproxy.io/docs/tasks/traffic/http-urlrewrite/), [Header modification](https://gateway.envoyproxy.io/docs/tasks/traffic/http-request-headers/).

7. **Major — §§4, 7, 14: Platform ownership and reconciliation are incomplete.**  
   The root Application points at `platform/argocd/apps`, while the preview project and ApplicationSet sit outside that directory. Their owner is unspecified. Likewise, nothing explains how changing `versions.yaml` updates child Application chart revisions. Helm-to-Argo handoff is described as automatic, without defining matching release names, values, CRD ownership, or subsequent bootstrap behavior.  
   **Claude action:** Add a concrete rendering/ownership map covering every platform manifest, including Gateway resources. Specify how version pins are consumed, dependency readiness, and the handoff procedure. After adoption, bootstrap must not independently upgrade the same resources. Argo uses Helm for rendering rather than managing Helm release lifecycle. [Argo Helm integration](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/).

8. **Major — §§5–7, 10, 13: Credential provisioning has missing connections.**  
   The ApplicationSet references `argocd-github-pr`, but bootstrap only explicitly creates the repository Secret. Writing `registries.yaml` after installing K3s also needs a restart. `gh` authentication alone does not authenticate Docker. Finally, a private-repository build workflow declaring only `packages: write` lacks the `contents: read` permission normally needed for checkout.  
   **Claude action:** Specify both Argo Secrets and rotation, write root-owned mode-0600 registry configuration before K3s startup or restart afterward, explicitly perform Docker login using stdin, and grant the build workflow `contents: read` plus `packages: write`. Keep the classic `read:packages` PAT choice—it is correct—and verify package access. [K3s registry configuration](https://docs.k3s.io/installation/private-registry), [GHCR authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

9. **Major — §11: Certificate caching and backups do not match renewal.**  
   A certificate fetched once keeps sealing against the old key despite renewal. Conversely, using a newly generated key before the next weekly backup creates a recoverability gap.  
   **Claude action:** Refresh certificates with fingerprint tracking; back up the complete key set immediately after initial creation and renewal, before permitting use of an unbacked key. Specify the Helm controller name for certificate retrieval. Preserve strict name/namespace binding and test rejection after either changes. [Sealed Secrets renewal and backup guidance](https://github.com/bitnami/sealed-secrets).

10. **Major — §§9, 11: A ciphertext checksum does not guarantee correct secret rotation.**  
    Applying an updated SealedSecret and Deployment together can start the replacement pod before the controller updates the existing Secret. The pod can retain the old environment value, with no later checksum change to trigger another rollout.  
    **Claude action:** Require successful unsealing of the current generation before Deployment rollout, using an explicit health check and sync ordering, or another deterministic rotation mechanism. Add a test that deliberately delays secret reconciliation and proves the running application eventually receives the new value.

11. **Major — §§1, 10, 13: Guaranteed merge prevention conflicts with the free/private premise.**  
    Required status checks need enforceable branch protection. GitHub documents private-repository protected branches under paid plans. The plan also mentions `no-preview-merge` without defining its workflow or protection configuration.  
    **Claude action:** Verify the account’s existing entitlement. If available, specify the required check, trusted workflow source, and bypass settings. Otherwise retain the private repository and describe merge prevention honestly as a procedural safeguard; remove the unconditional “blocked” guarantee and “no paid services required” implication for that enforcement. [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

12. **Major — §§10, 12, 14: Destruction removes the documented source for recreation.**  
    `proto destroy` deletes the branch containing the only desired configuration and ciphertext. Reusing the namespace preserves cryptographic compatibility, but does not recover those files. Closing a PR and destroying its branch have different recovery semantics.  
    **Claude action:** Retain the branch by default, archive its tip under a durable ref, or explicitly make destruction irreversible and exclude it from the recreation promise. Wait for Application/Namespace deletion before recreating the same app. Keep the chart-owned Namespace and cascading finalizer design; add deletion timeout diagnostics and avoid routine force-removal of finalizers. [ApplicationSet deletion behavior](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/).

13. **Major — §§9, 12, 14: SHA-looking tags are not immutable identities.**  
    GHCR tags can be reassigned. A content-only tag also omits base-image and build-recipe changes. Retention could delete images still needed by open previews, paused apps, or rollback commits.  
    **Claude action:** Resolve pushes and supplied tags to digests and commit the digest to app configuration. Define retention roots covering active/paused deployments and a bounded rollback history. Test rollback after cleanup. [GHCR digest pulls](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

14. **Major — §§6, 14, 16: Login startup is presented as unattended reboot recovery.**  
    A LaunchAgent starts at user login, which is weaker than “after a Mac reboot with no manual steps.” Recreating the VM also loses Tailscale identity/state; reinstalling Kubernetes and sealing keys does not recreate that identity or guarantee the same DNS name.  
    **Claude action:** Define the login/FileVault boundary explicitly. Pin Lima and select its supported login or boot startup mechanism. Add Tailscale reauthentication, stale-node cleanup, hostname verification, and Serve reconfiguration to recovery. Keep the 30-minute rebuild as a measured target until demonstrated. [Lima automatic startup](https://lima-vm.io/docs/usage/autostart/).

15. **Minor — §§8, 12: The static-build promise contradicts the CLI input.**  
    `proto deploy ./dist` receives an already-built bundle, so it cannot pass Vite `--base` during that build. Relative assets can also resolve incorrectly when a SPA is opened directly at nested URLs.  
    **Claude action:** Make `./dist` explicitly require a bundle built for `/<app>/`; show the preceding build command. Defer source-build integration, or define it as a separate CLI mode. Test actual asset requests after a nested-route refresh.

16. **Minor — §7: A custom 404 page requires more than a catch-all HTTPRoute.**  
    A standard HTTPRoute does not itself contain an arbitrary direct-response body. A catch-all placed in `gateway` also needs to satisfy the listener’s namespace selector.  
    **Claude action:** Use Envoy’s default unmatched-route 404 for v1. If a custom body is necessary, specify an Envoy `HTTPRouteFilter` extension or backend and its attachment permissions. [Envoy direct responses](https://gateway.envoyproxy.io/docs/tasks/traffic/direct-response/).

17. **Minor — §§9, 13, 15–16: Validation arrives too late and overstates its coverage.**  
    Helm rendering and a values schema do not prove API validity, route acceptance, admission security, or controller behavior. Schema rejection only works for fields actually constrained; it is not a Kubernetes admission boundary. Per-namespace memory limits also leave CPU, ephemeral storage, and aggregate app count unspecified.  
    **Claude action:** Introduce validation with the chart and ApplicationSet, before M4. Include server-side validation against pinned CRDs, route status checks, negative security tests, fixed resource ceilings, and worker/static-image smoke tests under the advertised security context. Specify Pod Security admission and whether inter-app/host-network access is intentionally allowed. Avoid adding another policy engine merely to achieve these checks.

**Overall verdict: ready after fixes — 6/10.** The selected stack does not need replacement. Correct the selection, recovery, ownership, and networking contracts before implementation; simplify custom 404 handling and optional Argo exposure to keep v1 manageable.