import {
  ArrowLeft,
  Building2,
  Calendar,
  Loader,
  Mail,
  Phone,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { sdk } from "@/lib/sdk";
import type { AdminUserDetail } from "@/sdk";
import { Card, CardContent, CardHeader, CardTitle, FormattedDate } from "@/ui";

const inputClass =
  "rounded-lg bg-muted/30 px-3 py-2 text-sm border border-border";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typedName, setTypedName] = useState("");

  const fetchUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setUser(await sdk.admin.findUser(id));
    } catch {
      toast.error("Failed to load user");
      navigate("/users");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  async function handleDelete() {
    if (!id || !user) return;
    if (typedName.trim().toLowerCase() !== user.email.toLowerCase()) {
      toast.error("Type the email exactly to confirm deletion");
      return;
    }
    setDeleting(true);
    try {
      await sdk.admin.deleteUser(id);
      toast.success("User and all associated data permanently deleted");
      navigate("/users", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete user");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/users")}
          className="rounded p-1.5 text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{user.name ?? "Unnamed User"}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Status card */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${user.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
        >
          {user.isActive ? (
            <UserCheck className="h-6 w-6" />
          ) : (
            <UserX className="h-6 w-6" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold">{user.name ?? "—"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.role === "SUPER_ADMIN" ? "bg-primary/10 text-primary" : user.role === "OWNER" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
            >
              {user.role}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${user.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </label>
              <div className={`${inputClass} flex items-center gap-2`}>
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{user.email}</span>
                <span
                  className={`ml-auto shrink-0 text-xs ${user.emailVerified ? "text-success" : "text-muted-foreground"}`}
                >
                  {user.emailVerified ? "Verified" : "Unverified"}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Phone
              </label>
              <div className={`${inputClass} flex items-center gap-2`}>
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{user.phone ?? "—"}</span>
                {user.phone && (
                  <span
                    className={`ml-auto shrink-0 text-xs ${user.phoneVerified ? "text-success" : "text-muted-foreground"}`}
                  >
                    {user.phoneVerified ? "Verified" : "Unverified"}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Username
              </label>
              <div className={`${inputClass}`}>
                <span>
                  {user.username ?? (
                    <span className="text-muted-foreground italic">
                      Not set
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Role
              </label>
              <div className={`${inputClass}`}>
                <span>{user.role}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Created
              </label>
              <div className={`${inputClass} flex items-center gap-2`}>
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <FormattedDate iso={user.createdAt} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Last Login
              </label>
              <div className={`${inputClass} flex items-center gap-2`}>
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                {user.lastLoginAt ? (
                  <FormattedDate iso={user.lastLoginAt} />
                ) : (
                  <span className="text-muted-foreground italic">Never</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shops */}
      <Card>
        <CardHeader>
          <CardTitle>Shops ({user.shops.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.shops.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No shops associated with this user.
            </p>
          ) : (
            <div className="space-y-2">
              {user.shops.map((shop) => (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => navigate(`/shops/${shop.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent transition-colors"
                >
                  <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{shop.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[shop.phone, shop.address].filter(Boolean).join(" · ") ||
                        "No details"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    <FormattedDate iso={shop.createdAt} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete section */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-destructive">
                  Delete this user
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete the user, their shops, and all associated
                  data. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3.5 py-2 text-sm font-medium text-white hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  This will permanently delete <strong>{user.email}</strong> and
                  all their data including shops, sales, customers, and
                  settings.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Type{" "}
                  <strong className="text-destructive">{user.email}</strong> to
                  confirm:
                </label>
                <input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-destructive/40 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-destructive/40"
                  placeholder={user.email}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setTypedName("");
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    deleting ||
                    typedName.trim().toLowerCase() !== user.email.toLowerCase()
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
