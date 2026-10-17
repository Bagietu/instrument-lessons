# Connecting the lessons database and admin panel

The app works without this: it shows the built-in starter lessons. These steps turn on
the admin panel at `#/admin`, where you can add, edit, reorder, delete and generate lessons
with Claude. Everything here fits in Supabase's and GitHub's free plans; Claude generation
is paid per use (a lesson costs a few cents).

## 1. Create the Supabase project

1. Sign in at https://supabase.com and create a new project (any name, free plan).
2. In **SQL Editor**, paste the contents of
   [`supabase/migrations/20261017000000_lessons.sql`](supabase/migrations/20261017000000_lessons.sql)
   and press **Run**. This creates the `lessons` table.
3. Note three values from **Project Settings**:
   - **Project ref**: the id in the dashboard URL, e.g. `abcdefghijklmnop`.
   - **Project URL**: `https://<project-ref>.supabase.co`.
   - **Publishable key** (or the legacy **anon** key), under **API Keys**. It's safe to make public.
4. Create an access token at https://supabase.com/dashboard/account/tokens so GitHub can deploy
   the admin function.

## 2. Get a Claude API key (for "Generate with Claude")

Create a key at https://console.anthropic.com/settings/keys and add some credit under Billing.
You can skip this; the admin panel then works without the generate button.

## 3. Add the settings to GitHub

In the repository, open **Settings → Secrets and variables → Actions**.

**Variables** tab (visible values):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_ANON_KEY` | the publishable / anon key |
| `SUPABASE_PROJECT_REF` | the project ref |

**Secrets** tab (hidden values):

| Name | Value |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | the access token from step 1.4 |
| `ADMIN_PASSWORD` | the admin password, e.g. `start123` |
| `ANTHROPIC_API_KEY` | the Claude API key (optional) |

## 4. Deploy

Open **Actions → Test and deploy → Run workflow** on `main`. It rebuilds the site with the
database settings and deploys the admin function to Supabase with the password and API key.

## 5. Fill the database

Open the site, tap **Admin** at the bottom, log in, and press **Copy starter lessons**.
From then on the app shows the lessons from the database.

## Changing the password later

Update the `ADMIN_PASSWORD` secret in GitHub and run the workflow again. The password is only
checked on the server, so it never appears in the website's code.
