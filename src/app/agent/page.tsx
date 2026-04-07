export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

export default async function AgentDashboard() {
  const cookieStr = (await cookies()).get("session")?.value;
  const session = await decrypt(cookieStr);

  const user = await prisma.user.findUnique({
    where: { id: session?.userId as string },
    include: {
      referralsMade: {
        include: { referredUser: true },
      },
    },
  });

  const totalCommission = user?.referralsMade.reduce((sum, ref) => sum + ref.commissionEarned, 0) || 0;
  const referralCount = user?.referralsMade.length || 0;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: "720px" }}>
        {/* Header */}
        <div className="dashboard-header animate-fade-in">
          <h1 className="dashboard-title">Agent Dashboard</h1>
          <p className="dashboard-subtitle">Track your referrals and commission earnings</p>
        </div>

        {/* Stats */}
        <div className="stat-grid animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
          <div className="stat-card">
            <span className="stat-card-label">Referred Users</span>
            <span className="stat-card-value info">{referralCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Total Commission</span>
            <span className="stat-card-value accent">₹{totalCommission.toLocaleString()}</span>
          </div>
        </div>

        {/* Referral Link */}
        <div className="panel animate-fade-in-up" style={{ marginBottom: "var(--space-xl)" }}>
          <div className="panel-header">
            <h2 className="panel-title">🔗 Your Referral Link</h2>
          </div>
          <div className="panel-body">
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
              Share this link with potential users. When they register, they&apos;ll be automatically linked to your account.
            </p>
            <div className="referral-box">
              <p className="referral-box-label">Shareable Link</p>
              <p className="referral-box-link">
                {typeof window !== "undefined" ? window.location.origin : "https://byby.web.app"}/login?ref={user?.id}
              </p>
            </div>
          </div>
        </div>

        {/* Referral History */}
        <div className="panel animate-fade-in-up">
          <div className="panel-header">
            <h2 className="panel-title">👥 Referral History</h2>
            <span className="badge badge-info">{referralCount} total</span>
          </div>
          {referralCount === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
              <div className="empty-state-icon">📬</div>
              <p className="empty-state-message">No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div>
              {user?.referralsMade.map((ref) => (
                <div key={ref.id} className="list-item">
                  <div>
                    <strong style={{ fontSize: "0.95rem" }}>
                      {ref.referredUser.name.charAt(0)}***{ref.referredUser.name.slice(-1)}
                    </strong>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-tertiary)", margin: 0 }}>
                      Joined {new Date(ref.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                    ₹{ref.commissionEarned.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
