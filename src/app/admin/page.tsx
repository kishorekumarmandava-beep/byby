export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { approveCategory, rejectCategory } from "../actions/categoryActions";

export default async function AdminDashboard() {
  const pendingCategories = await prisma.category.findMany({ where: { isApproved: false } });
  const totalUsers = await prisma.user.count();
  const totalVendors = await prisma.vendorProfile.count();
  const totalProducts = await prisma.product.count();
  const totalOrders = await prisma.order.count();

  // Get vendors approaching compliance threshold
  const flaggedVendors = await prisma.vendorProfile.findMany({
    where: {
      gstin: null,
      totalSales: { gte: 1000000 },
    },
    include: { user: true },
  });

  // Recent orders for audit
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header animate-fade-in">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Platform oversight, compliance monitoring, and user management</p>
        </div>

        {/* Stats */}
        <div className="stat-grid animate-fade-in-up" style={{ marginBottom: "var(--space-2xl)" }}>
          <div className="stat-card">
            <span className="stat-card-label">Total Users</span>
            <span className="stat-card-value info">{totalUsers}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Vendors</span>
            <span className="stat-card-value primary">{totalVendors}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Products</span>
            <span className="stat-card-value accent">{totalProducts}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Orders</span>
            <span className="stat-card-value">{totalOrders}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-xl)", alignItems: "start" }}>
          {/* Pending Categories */}
          <div className="panel animate-fade-in-up" style={{ gridColumn: pendingCategories.length === 0 && flaggedVendors.length === 0 ? "1 / -1" : undefined }}>
            <div className="panel-header">
              <h2 className="panel-title">📂 Pending Categories</h2>
              <span className="badge badge-warning">{pendingCategories.length}</span>
            </div>
            {pendingCategories.length === 0 ? (
              <div className="empty-state" style={{ padding: "var(--space-xl)" }}>
                <p className="empty-state-message" style={{ fontSize: "0.9rem" }}>No pending requests</p>
              </div>
            ) : (
              <div>
                {pendingCategories.map((cat: any) => (
                  <div key={cat.id} className="list-item">
                    <strong style={{ fontSize: "0.95rem" }}>{cat.name}</strong>
                    <div className="list-item-actions">
                      <form action={approveCategory}>
                        <input type="hidden" name="id" value={cat.id} />
                        <button type="submit" className="btn btn-accent btn-sm">Approve</button>
                      </form>
                      <form action={rejectCategory}>
                        <input type="hidden" name="id" value={cat.id} />
                        <button type="submit" className="btn btn-danger btn-sm">Reject</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance Flags */}
          {flaggedVendors.length > 0 && (
            <div className="panel animate-fade-in-up">
              <div className="panel-header">
                <h2 className="panel-title">⚠️ Compliance Alerts</h2>
                <span className="badge badge-danger">{flaggedVendors.length}</span>
              </div>
              <div>
                {flaggedVendors.map((v: any) => (
                  <div key={v.id} className="list-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", width: "100%" }}>
                      <strong>{v.businessName}</strong>
                      <span className="badge badge-danger" style={{ marginLeft: "auto" }}>No GSTIN</span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
                      Sales: ₹{v.totalSales.toLocaleString()} · {v.user.email}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders Audit */}
        {recentOrders.length > 0 && (
          <div className="panel animate-fade-in-up" style={{ marginTop: "var(--space-xl)" }}>
            <div className="panel-header">
              <h2 className="panel-title">📋 Recent Orders (Audit Log)</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Buyer</th>
                    <th>Total</th>
                    <th>TDS</th>
                    <th>TCS</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: any) => (
                    <tr key={order.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{order.id.slice(0, 12)}...</td>
                      <td>{order.user.name}</td>
                      <td style={{ fontWeight: 600 }}>₹{order.totalAmount.toFixed(2)}</td>
                      <td>₹{order.tdsAmount.toFixed(2)}</td>
                      <td>₹{order.tcsAmount.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${order.status === "COMPLETED" ? "badge-success" : order.status === "CANCELLED" ? "badge-danger" : "badge-warning"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
