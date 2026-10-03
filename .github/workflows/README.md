# Workflow scope

`ci.yml` validates PRs and pushes on `main`, `dev`, `frontend`, and `ci/**`.
The `CI gate` job is the required branch-protection check. It fails if any dependency fails or is cancelled.

This phase runs CI only. The build and isolated production smoke are checks; no release package, publish or deployment is configured. The dependency audit report is retained for review.

Fork PRs use `pull_request`, read-only permissions and no AI credentials. Never switch to `pull_request_target` to execute contributor code.

Actions are pinned to full commit SHAs. Dependabot proposes updates; review and run the same gates before accepting them.
