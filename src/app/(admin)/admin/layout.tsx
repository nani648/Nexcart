import { requireAdminPage } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

// Runs on the server, before any child page fetches or renders anything.
// requireAdminPage() redirects away immediately (to /sign-in if not logged
// in, to / if logged in but not an admin) — so unlike the previous
// client-side check, nobody ever receives the HTML/data for an admin page
// they're not allowed to see, not even for an instant.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
