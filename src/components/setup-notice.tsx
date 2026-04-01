import { MessageBanner } from "@/components/message-banner";

export function SetupNotice() {
  return (
    <MessageBanner tone="info">
      Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, and `AUTH_SECRET` before using live data.
      SQL files are in `supabase/schema.sql` and `supabase/seed.sql`.
    </MessageBanner>
  );
}
