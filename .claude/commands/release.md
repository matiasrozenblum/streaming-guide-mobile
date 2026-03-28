Create a release for the mobile app (iOS + Android).

## Context
- Releases are cut from `develop` branch.
- A `release/X.Y.Z` branch is created with a PR to `main`.
- After merging to `main`, EAS builds must be triggered manually.
- Version: $ARGUMENTS (e.g., `/release 1.1.0`)
- `app.config.ts` contains the version field that must be updated.

## Steps

### 1. Validate state
- Confirm current branch is `develop`. If not, ask the user if you should switch.
- Run `git pull origin develop` to ensure latest code.
- Run `git tag -l | sort -V | tail -5` to show recent version tags.
- If no version was provided in $ARGUMENTS, ask the user what version to use.

### 2. Analyze changes for CHANGELOG
- Run `git log $(git describe --tags --abbrev=0 2>/dev/null || echo main)..HEAD --oneline` to see commits since last release.
- Categorize changes into: Added, Changed, Fixed, Removed.
- Draft the CHANGELOG entry.

### 3. Update version in app.config.ts
- Read `app.config.ts` and update the `version` field to the new version.

### 4. Update CHANGELOG.md
- If CHANGELOG.md doesn't exist, create it with the standard header.
- Add the new version entry after the `---` separator (after [Unreleased] section).
- Keep the [Unreleased] template intact.
- Format:
  ```
  ## [X.Y.Z] - YYYY-MM-DD

  ### Added
  - ...

  ### Changed
  - ...

  ### Fixed
  - ...
  ```
- Show the CHANGELOG entry and version change to the user for confirmation.

### 5. Create release branch
- Run: `git checkout -b release/X.Y.Z`
- Commit changes: `git commit -a -m "Release X.Y.Z"`
- Run: `git push -u origin release/X.Y.Z`

### 6. Create git tag
- Run: `git tag X.Y.Z && git push origin X.Y.Z`

### 7. Create PR to main
- Run:
  ```
  gh pr create --base main --head release/X.Y.Z --title "Release X.Y.Z" --body "<changelog entry>"
  ```

### 8. Return to develop
- Run: `git checkout develop`

### 9. Report and next steps
- Show the PR URL.
- Remind the user: "After merging the PR to main, run EAS builds:"
  ```
  eas build --platform android --profile production
  eas build --platform ios --profile production
  eas submit --platform ios --profile production
  ```
- EAS profiles available (from eas.json):
  - `production` — Production build (auto-increment)
  - `production-apk` — Production APK (for direct install)
  - `staging-testflight` — Staging for TestFlight
  - `preview` — Internal distribution (staging variant)

## Important
- Always show the CHANGELOG entry and get user confirmation before committing.
- Update the `version` field in `app.config.ts` — this determines the version shown to users.
- If any step fails, stop and explain. Do NOT force-push.
