# rollback.md

## Purpose
Quick reference for undoing a bad change, since a full day was spent today untangling an unsupervised redesign that landed on `main`. Keep this short and actually usable under pressure.

## If a bad commit was just pushed to main (not yet deployed, or deploy just ran)

1. Confirm the bad commit hash:
```
git log --oneline -5
```

2. Revert it (creates a new commit undoing the changes, keeps history intact — safer than reset):
```
git revert <bad-commit-hash>
git push
```

3. Check the Actions tab to confirm the revert deployed successfully.

4. Hard-refresh + unregister the service worker on the live site to confirm the rollback is actually visible (see known-issues.md #1 — don't trust a push alone).

## If you need to go back further (multiple bad commits)

```
git log --oneline -10
git revert <oldest-bad-hash>..<newest-bad-hash>
git push
```

## If working on a dev branch and it's a mess (once dev branch setup is complete)

Just abandon the branch — nothing has touched `main`, so there's no risk:
```
git checkout main
git branch -D dev
git checkout -b dev
```
Start the chunk over.

## Before any redesign chunk, always know your safe point

```
git log --oneline -1
```
Note this commit hash before starting each page's redesign. If that page's changes go wrong, `git revert` back to this exact point rather than guessing.

## Do NOT use `git reset --hard` on main
It rewrites history and can silently discard work if anything else was pushed in the meantime. `git revert` is always the safer default for this project.
