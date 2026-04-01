# FrikFrak

FrikFrak is a web-based Yik Yak style app for college frisbee communities. The MVP is anonymous by default, category-based, and built for quick Vercel deployment with `Next.js` + `Supabase`.

## MVP Features

- Honor-system username/password accounts
- Private usernames with anonymous public posts
- Default `General` feed
- Admin-created categories
- Unlimited nested comments
- `OP`, `#1`, `#2`, ... thread labels
- Upvotes and downvotes
- Reports and lightweight admin moderation
- Post/comment soft deletion that preserves thread structure
- Hashtag storage and searchable tag pages

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env.local
```

3. Create a Supabase project and add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SECRET`
- optional `FIRST_ADMIN_USERNAME`

4. Run the SQL files in this order inside Supabase SQL editor:

- [`supabase/schema.sql`](/Users/bshowell/Desktop/junk/projects/FrikFrak/supabase/schema.sql)
- [`supabase/seed.sql`](/Users/bshowell/Desktop/junk/projects/FrikFrak/supabase/seed.sql)

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Admin bootstrap

- If `FIRST_ADMIN_USERNAME` is set, that username becomes admin on signup.
- Otherwise, the first created account becomes admin automatically.

## Deploying to Vercel

- Push the repo to GitHub.
- Create a new Vercel project.
- Add the same environment variables in Vercel.
- Deploy to the temporary `*.vercel.app` domain first.

## Notes

- Usernames are intentionally not public.
- Post deletion removes the post from feeds but keeps the direct-link thread page.
- Comment deletion replaces the body with a deleted placeholder while preserving replies.
