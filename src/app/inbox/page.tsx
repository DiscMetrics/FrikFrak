import { InboxList } from "@/components/inbox-list";
import { SiteShell } from "@/components/site-shell";
import { SetupNotice } from "@/components/setup-notice";
import { requireUser } from "@/lib/auth";
import { getInboxItems } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  if (!isSupabaseConfigured()) {
    return (
      <SiteShell title="Inbox" subtitle="Connect Supabase to use inbox notifications." currentPath="/inbox">
        <SetupNotice />
      </SiteShell>
    );
  }

  const viewer = await requireUser();
  const items = await getInboxItems(viewer.id);

  return (
    <SiteShell
      title="Inbox"
      subtitle="Direct replies to your posts and comments show up here."
      currentPath="/inbox"
      backHref="/feed"
      backLabel="Feeds"
    >
      <InboxList initialItems={items} />
    </SiteShell>
  );
}
