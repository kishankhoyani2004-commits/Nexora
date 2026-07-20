import AdminAnalytics from "@/pages/admin/AdminAnalytics";

// The default admin landing page mirrors the Analytics overview —
// kept as its own route/file per the routing spec so it can diverge later.
export default function AdminDashboard() {
  return <AdminAnalytics />;
}
