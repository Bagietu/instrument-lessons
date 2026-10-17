# Using the admin panel

The admin panel is at `#/admin` on the site (link at the bottom of every page). The password is
`start123` (set in `src/admin/api.ts`). It is checked in the browser, so it only keeps casual visitors out.

There is no server or database. The panel saves lessons by committing `src/lessons/lessons.json`
to this repository with your own GitHub token, and the site redeploys about a minute later.
Lesson drafts are written by Claude using your own Claude API key. Both keys are stored only
in the browser you paste them into.

## 1. GitHub token (needed to save)

1. Open https://github.com/settings/personal-access-tokens/new
2. Name it "Instrument lessons admin" and pick an expiry.
3. Under **Repository access**, choose **Only select repositories** and pick `instrument-lessons`.
4. Under **Permissions → Repository permissions**, set **Contents** to **Read and write**.
5. Click **Generate token** and copy it.
6. In the admin panel, click **Keys**, paste it under "GitHub token" and save.

## 2. Claude API key (optional, for "Generate with Claude")

1. Open https://console.anthropic.com/settings/keys and create a key (needs a little credit on the account).
2. In the admin panel, click **Keys**, paste it under "Claude API key" and save.

Generating a lesson only makes a draft; nothing is saved until you press Save in the editor.
