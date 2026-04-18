"use client";

import { useEffect, useState } from "react";
import { Plus, Shield, Users } from "lucide-react";
import { createUser, getUsers } from "@/lib/actions/userActions";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

const ROLE_OPTIONS = [
  { value: "operator", label: "Operator" },
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "user", label: "User" },
];

export default function UsersPageClient() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data as AppUser[]);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;

    void (async () => {
      const data = await getUsers();
      if (!active) return;
      setUsers(data as AppUser[]);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await createUser(formData);

    if (!result.success) {
      setError(result.error ?? "Unable to create user.");
      setSaving(false);
      return;
    }

    form.reset();
    closeModal();
    setSuccess(`Created ${result.user?.name ?? "user"} successfully.`);
    await loadUsers();
    setSaving(false);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h2>Users</h2>
          <p>Admin-only access to create and manage login accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Create User
        </button>
      </div>

      {success ? <div className="feedback-banner success">{success}</div> : null}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={20} />
          </div>
          <div>
            <div className="stat-value">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Shield size={20} />
          </div>
          <div>
            <div className="stat-value">
              {users.filter((user) => user.role === "admin").length}
            </div>
            <div className="stat-label">Admins</div>
          </div>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>
      ) : users.length === 0 ? (
        <div className="card empty-state">
          <Users size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>No users found</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Create First User
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.name}</td>
                  <td style={{ color: "var(--color-text-muted)" }}>{user.email}</td>
                  <td>
                    <span className={`badge badge-role-${user.role}`}>{user.role}</span>
                  </td>
                  <td style={{ color: "var(--color-text-muted)" }}>
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create User</h3>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  name="name"
                  className="form-input"
                  placeholder="e.g. Rohan Sharma"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="name@cols.com"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select name="role" className="form-input" defaultValue="operator">
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error ? <div className="form-error">{error}</div> : null}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
