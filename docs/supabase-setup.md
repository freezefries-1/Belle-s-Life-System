# Turning on cloud sync (Supabase)

You do this once. Until it's done, the app keeps saving to your browser exactly as before.

## 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region near you and save the database password somewhere safe.
2. When it's ready, open **Project Settings → API** (or **Connect**) and copy:
   - **Project URL**, for example `https://abcd1234.supabase.co`;
   - the **publishable key** (`sb_publishable_…`). Older projects show an **anon** key instead; that works too.

   Never copy the **service_role / secret** key into the app.

## 2. Create the tables and security rules
1. In Supabase, open **SQL Editor → New query**.
2. Paste the whole file `supabase/migrations/20261012000000_initial_schema.sql` and press **Run**. It creates every table, constraint, index, Row Level Security policy and function. It only creates things; it doesn't delete anything.

   (With the Supabase CLI: `supabase link` then `supabase db push`.)

## 3. Set up sign-in
1. **Authentication → Sign In / Providers → Email**: keep Email enabled.
2. **Authentication → URL Configuration**:
   - **Site URL**: your Vercel address, for example `https://belles-life-system.vercel.app`.
   - **Redirect URLs**: add `https://belles-life-system.vercel.app/auth/confirm` (and `http://localhost:3000/auth/confirm` for local development).
3. Create your account. Either:
   - open the app after step 4 and choose **Create an account** (confirm the email if Supabase asks), or
   - use **Authentication → Users → Add user**.
4. Optional but recommended for a personal app: after your account exists, turn off **Allow new users to sign up**, so nobody else can create an account.

Supabase's built-in email sender is limited to a few emails per hour, which is fine for password resets. Add your own SMTP under **Authentication → Emails** if you need more.

## 4. Tell Vercel
In Vercel → your project → **Settings → Environment Variables**, add:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your publishable (or anon) key |

Then **redeploy**. Environment variables only take effect in a new build.

For local development, copy `.env.example` to `.env.local` and fill in the same two values.

## 5. Move your existing data
1. Open the app **in the same browser you've been using** (that's where your data is) and sign in.
2. Go to **Preferences → Your data → Move this browser's data into your account**.
3. Click **Backup** to download a copy, then **Preview import**, tick the confirmation, and **Import into my account**.
4. Check that everything looks right. Only then, if you like, use **Clear browser copy**. Nothing is deleted automatically.

## Going back
Remove the two environment variables in Vercel and redeploy. The app returns to browser-only mode, and your cloud data stays in Supabase.
