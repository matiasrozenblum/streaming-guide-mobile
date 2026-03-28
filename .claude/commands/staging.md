Deploy current branch changes to staging.

## Context
Mobile does not auto-deploy on staging push. Staging is used for:
- Keeping an integration branch for testing
- Optionally triggering EAS staging builds

## Steps

### 1. Validate state
- Run `git status` and `git diff --stat` to see what will be committed.
- Confirm you are NOT on `develop`, `staging`, or `main` branch.
- If there are no changes to commit, ask the user if they want to just merge the existing commits to staging.

### 2. Commit changes
- Analyze the diff and generate a concise, meaningful commit message.
- Show the proposed commit message to the user and ask for confirmation before committing.
- Run `git add -A && git commit -m "<message>"`.

### 3. Push feature branch
- Run `git push origin <current-branch>`.

### 4. Merge to staging
- Run: `git checkout staging && git pull origin staging`
- Run: `git merge -X theirs <feature-branch>`
- If there are merge conflicts, resolve them favoring the feature branch changes.
- Run: `git push origin staging`

### 5. Return to feature branch
- Run: `git checkout <feature-branch>`

### 6. Report
- Confirm: "Changes merged to staging."
- Ask if the user wants to trigger an EAS staging build:
  - Android: `eas build --platform android --profile staging`
  - iOS: `eas build --platform ios --profile staging`

## Important
- Always confirm the commit message with the user before committing.
- If any git operation fails, stop and explain what went wrong. Do NOT force-push.
