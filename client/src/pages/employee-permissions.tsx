import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card, Skeleton } from "@/ui";
import { API_URL, tokenStore } from "@/lib/sdk";
import { useI18n } from "@/lib/i18n";

interface PermissionItem {
  slug: string;
  label: string;
  description: string;
  granted: boolean;
}

interface PermissionGroup {
  group: string;
  permissions: PermissionItem[];
}

async function apiGet(path: string) {
  const token = tokenStore.getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const envelope = await res.json();
  return envelope?.data ?? envelope;
}

export default function EmployeePermissionsPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [original, setOriginal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiGet(`/api/v1/permissions/employees/${id}`)
      .then((data) => {
        const allPerms: PermissionItem[] = [];
        for (const g of data) allPerms.push(...g.permissions);
        const map: Record<string, boolean> = {};
        for (const p of allPerms) map[p.slug] = p.granted;
        setOriginal(map);
        setGroups(data);
      })
      .catch(() => toast.error(t("failedLoadPermissions")))
      .finally(() => setLoading(false));

    apiGet(`/api/v1/users/${id}`).then((emp: any) => {
      if (emp?.name) setEmployeeName(emp.name);
    }).catch(() => {});
  }, [id, t]);

  function toggle(slug: string, current: boolean) {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        permissions: g.permissions.map((p) =>
          p.slug === slug ? { ...p, granted: !current } : p,
        ),
      })),
    );
    setDirty(true);
  }

  function toggleGroup(groupName: string, grant: boolean) {
    setGroups((prev) =>
      prev.map((g) =>
        g.group === groupName
          ? { ...g, permissions: g.permissions.map((p) => ({ ...p, granted: grant })) }
          : g,
      ),
    );
    setDirty(true);
  }

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    const updates: Array<{ slug: string; granted: boolean }> = [];
    for (const g of groups) {
      for (const p of g.permissions) {
        if (p.granted !== original[p.slug]) {
          updates.push({ slug: p.slug, granted: p.granted });
        }
      }
    }
    if (updates.length === 0) {
      setDirty(false);
      setSaving(false);
      return;
    }
    try {
      const token = tokenStore.getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/permissions/employees/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json().catch(() => ({}));
      const data = json?.data ?? json;
      if (!res.ok) throw new Error();
      setGroups(data);
      const allPerms: PermissionItem[] = [];
      for (const g of data) allPerms.push(...g.permissions);
      const map: Record<string, boolean> = {};
      for (const p of allPerms) map[p.slug] = p.granted;
      setOriginal(map);
      setDirty(false);
      toast.success(t("permissionsSaved"));
    } catch {
      toast.error(t("failedSavePermissions"));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        permissions: g.permissions.map((p) => ({ ...p, granted: original[p.slug] ?? p.granted })),
      })),
    );
    setDirty(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <button type="button" onClick={() => navigate("/employees")}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-1">
            <ArrowLeft className="h-4 w-4" /> {t("backToEmployees")}
          </button>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("permissionsFor")}: {employeeName || t("employees")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("permissionsDescription")}
          </p>
        </div>
      </div>

      {dirty && (
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 rounded-lg border border-border bg-background/95 backdrop-blur p-3">
          <p className="text-sm text-muted-foreground mr-auto">{t("unsavedChanges")}</p>
          <button type="button" onClick={handleCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent">
            {t("cancel")}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("saveChanges")}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group) => {
          const allGranted = group.permissions.every((p) => p.granted);

          return (
            <Card key={group.group} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.group}
                </h3>
                <button type="button" onClick={() => toggleGroup(group.group, !allGranted)}
                  className="text-xs text-primary hover:underline">
                  {allGranted ? t("revokeAll") : t("grantAll")}
                </button>
              </div>
              <div className="space-y-1">
                {group.permissions.map((perm) => (
                  <div key={perm.slug} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                    <button type="button" onClick={() => toggle(perm.slug, perm.granted)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${perm.granted ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${perm.granted ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {groups.length > 0 && (
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={handleCancel} disabled={!dirty}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-40">
            {t("cancel")}
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("saveChanges")}
          </button>
        </div>
      )}
    </div>
  );
}
