import {
  Activity,
  Bell,
  Bot,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  HardDrive,
  Key,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  Plug,
  Save,
  Send,
  Smartphone,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, FormattedDate, Skeleton } from "@/ui";
import { sdk } from "@/lib/sdk";
import type { AdminSession, AuditLogSummary, SystemSetting } from "@/sdk";

// ─── Shared helpers ──────────────────────────────────────────────────────────

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

/** Read a string setting from the loaded list. */
function val(settings: SystemSetting[], key: string, fallback = ""): string {
  return settings.find((s) => s.key === key)?.value ?? fallback;
}
/** Read a boolean setting; `defaultValue` is used when the key is absent. */
function bool(
  settings: SystemSetting[],
  key: string,
  defaultValue: boolean,
): boolean {
  const v = settings.find((s) => s.key === key)?.value;
  return v === undefined ? defaultValue : v === "true";
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`}
      />
    </button>
  );
}

function SaveBtn({
  onClick,
  saving,
  label = "Save",
}: {
  onClick: () => void;
  saving?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
    >
      <Save className="h-4 w-4" /> {saving ? "Saving…" : label}
    </button>
  );
}

/** Section card with a header, an optional enable toggle, and a footer save row. */
function IntegrationCard({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  children,
  onSave,
  saving,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {onToggle && <Toggle value={!!enabled} onChange={onToggle} />}
      </div>
      {(enabled === undefined || enabled) && (
        <div className="mt-5 space-y-4">{children}</div>
      )}
      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <SaveBtn onClick={onSave} saving={saving} />
      </div>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SecretField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  showValue,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showValue?: string;
}) {
  const [visible, setVisible] = useState(false);

  const displayValue = showValue ?? (value ? "••••••••••••••••" : "");
  const inputValue = visible ? value : displayValue;

  async function copy() {
    const text = showValue ?? value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            value={inputValue}
            onChange={(e) => {
              if (visible) {
                onChange(e.target.value);
              }
            }}
            type={visible ? "text" : "password"}
            className={`${inputClass} pr-12`}
            placeholder={placeholder}
            autoComplete="off"
            readOnly={!visible}
            onFocus={(e) => { if (!visible) e.target.blur(); }}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
            title={visible ? "Hide" : "Show"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Copy"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </Field>
  );
}

/** Inline "send a test" row used inside each integration card. */
function TestRow({
  label,
  placeholder,
  withInput,
  onTest,
}: {
  label: string;
  placeholder?: string;
  withInput: boolean;
  onTest: (to: string) => Promise<void>;
}) {
  const [to, setTo] = useState("");
  const [testing, setTesting] = useState(false);

  async function run() {
    setTesting(true);
    try {
      await onTest(to.trim());
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        {withInput && (
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={placeholder}
            className={`${inputClass} flex-1`}
          />
        )}
        <button
          type="button"
          onClick={run}
          disabled={testing || (withInput && !to.trim())}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {testing ? "Testing…" : "Send Test"}
        </button>
      </div>
    </div>
  );
}

async function saveSettings(entries: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(entries).map(([key, value]) =>
      sdk.admin.upsertSystemSetting(key, value),
    ),
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ existing }: { existing: SystemSetting[] }) {
  const [appName, setAppName] = useState(
    val(existing, "app_name", "Lela Kasa"),
  );
  const [timezone, setTimezone] = useState(
    val(existing, "default_timezone", "Africa/Addis_Ababa"),
  );
  const [currency, setCurrency] = useState(
    val(existing, "default_currency", "ETB"),
  );
  const [lang, setLang] = useState(val(existing, "default_language", "en"));
  const [lowStockDefault, setLowStockDefault] = useState(
    val(existing, "low_stock_default", "12"),
  );
  const [supportPhone, setSupportPhone] = useState(
    val(existing, "support_phone", ""),
  );
  const [supportEmail, setSupportEmail] = useState(
    val(existing, "support_email", ""),
  );
  const [supportTelegram, setSupportTelegram] = useState(
    val(existing, "support_telegram", ""),
  );
  const [supportWhatsapp, setSupportWhatsapp] = useState(
    val(existing, "support_whatsapp", ""),
  );
  const [supportHours, setSupportHours] = useState(
    val(existing, "support_hours", ""),
  );
  const [supportUrl, setSupportUrl] = useState(
    val(existing, "support_url", ""),
  );
  const [supportMessage, setSupportMessage] = useState(
    val(existing, "support_message", ""),
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    bool(existing, "maintenance_mode", false),
  );
  const [registrationOpen, setRegistrationOpen] = useState(
    bool(existing, "registration_open", true),
  );
  const [saving, setSaving] = useState(false);

  const toggleMaintenance = useCallback((next: boolean) => {
    setMaintenanceMode(next);
    toast[next ? "warning" : "success"](
      next
        ? "Maintenance mode will block all non-admin access once you save."
        : "The platform will be accessible to all users once you save.",
    );
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        app_name: appName,
        default_timezone: timezone,
        default_currency: currency,
        default_language: lang,
        low_stock_default: lowStockDefault,
        support_phone: supportPhone,
        support_email: supportEmail,
        support_telegram: supportTelegram,
        support_whatsapp: supportWhatsapp,
        support_hours: supportHours,
        support_url: supportUrl,
        support_message: supportMessage,
        maintenance_mode: maintenanceMode ? "true" : "false",
        registration_open: registrationOpen ? "true" : "false",
      });
      toast.success("General settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Globe className="h-4 w-4" /> Application
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Application Name">
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Default Language">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className={inputClass}
            >
              <option value="en">English</option>
              <option value="am">Amharic</option>
            </select>
          </Field>
          <Field label="Default Timezone">
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputClass}
              placeholder="Africa/Addis_Ababa"
            />
          </Field>
          <Field label="Default Currency">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              <option value="ETB">ETB (Birr)</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Default Low Stock Threshold">
            <input
              value={lowStockDefault}
              onChange={(e) => setLowStockDefault(e.target.value)}
              type="number"
              className={inputClass}
            />
          </Field>
          <Field
            label="Support / Contact Phone"
            hint="Shown to shop owners on the payment and pending screens so they can call for help."
          >
            <input
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              type="tel"
              className={inputClass}
              placeholder="+251 9XX XXX XXX"
            />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Monitor className="h-4 w-4" /> Platform Access
        </h3>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground">
              Blocks all non-admin access to the platform
            </p>
          </div>
          <Toggle value={maintenanceMode} onChange={toggleMaintenance} />
        </div>
        <div className="flex items-center justify-between border-t border-border py-2">
          <div>
            <p className="text-sm font-medium">Registration Open</p>
            <p className="text-xs text-muted-foreground">
              Allow new shop owners to create accounts
            </p>
          </div>
          <Toggle value={registrationOpen} onChange={setRegistrationOpen} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4" /> Support Contact
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Shown to shop owners in the client and mobile apps so they can reach
          you.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support Phone">
            <input
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              type="tel"
              className={inputClass}
              placeholder="+251 9XX XXX XXX"
            />
          </Field>
          <Field label="Support Email">
            <input
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              type="email"
              className={inputClass}
              placeholder="support@kasa.app"
            />
          </Field>
          <Field label="Support Telegram" hint="@username or t.me link">
            <input
              value={supportTelegram}
              onChange={(e) => setSupportTelegram(e.target.value)}
              className={inputClass}
              placeholder="@KasaSupport"
            />
          </Field>
          <Field label="Support WhatsApp">
            <input
              value={supportWhatsapp}
              onChange={(e) => setSupportWhatsapp(e.target.value)}
              type="tel"
              className={inputClass}
              placeholder="+251 9XX XXX XXX"
            />
          </Field>
          <Field label="Support Hours">
            <input
              value={supportHours}
              onChange={(e) => setSupportHours(e.target.value)}
              className={inputClass}
              placeholder="Mon–Sat, 8am–6pm"
            />
          </Field>
          <Field label="Support Page URL">
            <input
              value={supportUrl}
              onChange={(e) => setSupportUrl(e.target.value)}
              className={inputClass}
              placeholder="https://kasa.app/help"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Support Message"
              hint="A short note shown above the contacts"
            >
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={2}
                className={`${inputClass} h-auto py-2`}
                placeholder="Need help? Reach our team through any channel below."
              />
            </Field>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <SaveBtn onClick={save} saving={saving} />
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ existing }: { existing: SystemSetting[] }) {
  const [minPwLen, setMinPwLen] = useState(
    val(existing, "password_min_length", "8"),
  );
  const [sessionTimeout, setSessionTimeout] = useState(
    val(existing, "session_timeout_minutes", "60"),
  );
  const [maxAttempts, setMaxAttempts] = useState(
    val(existing, "max_login_attempts", "5"),
  );
  const [lockoutMins, setLockoutMins] = useState(
    val(existing, "lockout_duration_minutes", "30"),
  );
  const [requireVerify, setRequireVerify] = useState(
    bool(existing, "require_email_verification", false),
  );
  const [twoFactor, setTwoFactor] = useState(
    bool(existing, "require_two_factor", false),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        password_min_length: minPwLen,
        session_timeout_minutes: sessionTimeout,
        max_login_attempts: maxAttempts,
        lockout_duration_minutes: lockoutMins,
        require_email_verification: requireVerify ? "true" : "false",
        require_two_factor: twoFactor ? "true" : "false",
      });
      toast.success("Security settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4" /> Password & Session Policy
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum Password Length">
          <input
            value={minPwLen}
            onChange={(e) => setMinPwLen(e.target.value)}
            type="number"
            className={inputClass}
          />
        </Field>
        <Field label="Max Login Attempts">
          <input
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(e.target.value)}
            type="number"
            className={inputClass}
          />
        </Field>
        <Field label="Session Timeout (minutes)">
          <input
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
            type="number"
            className={inputClass}
          />
        </Field>
        <Field label="Lockout Duration (minutes)">
          <input
            value={lockoutMins}
            onChange={(e) => setLockoutMins(e.target.value)}
            type="number"
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Require Email Verification</span>
          <Toggle value={requireVerify} onChange={setRequireVerify} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Require Two-Factor Auth</span>
          <Toggle value={twoFactor} onChange={setTwoFactor} />
        </div>
      </div>
      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <SaveBtn onClick={save} saving={saving} />
      </div>
    </Card>
  );
}

// ─── Integrations Tab — all API keys ──────────────────────────────────────────

function EmailIntegration({ existing }: { existing: SystemSetting[] }) {
  const [enabled, setEnabled] = useState(bool(existing, "email_enabled", true));
  const [provider, setProvider] = useState(val(existing, "mail_provider", "smtp"));
  const [smtpHost, setSmtpHost] = useState(val(existing, "smtp_host"));
  const [smtpPort, setSmtpPort] = useState(val(existing, "smtp_port", "587"));
  const [smtpUser, setSmtpUser] = useState(val(existing, "smtp_user"));
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState(
    val(existing, "from_email", "noreply@kasa.app"),
  );
  const [resendApiKey, setResendApiKey] = useState(
    val(existing, "resend_api_key"),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const entries: Record<string, string> = {
        email_enabled: enabled ? "true" : "false",
        mail_provider: provider,
        from_email: fromEmail,
      };
      if (provider === "resend") {
        entries["resend_api_key"] = resendApiKey;
      } else if (provider === "smtp") {
        entries["smtp_host"] = smtpHost;
        entries["smtp_port"] = smtpPort;
        entries["smtp_user"] = smtpUser;
        if (smtpPassword) entries["smtp_password"] = smtpPassword;
      }
      await saveSettings(entries);
      setSmtpPassword("");
      toast.success("Email settings saved");
    } catch {
      toast.error("Failed to save email settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <IntegrationCard
      icon={Mail}
      title="Email"
      description="Transactional email — verification, password resets, payment alerts."
      enabled={enabled}
      onToggle={setEnabled}
      onSave={save}
      saving={saving}
    >
      <Field label="Email Provider">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          <option value="resend">Resend</option>
          <option value="smtp">SMTP</option>
          <option value="log">Log only (development)</option>
        </select>
      </Field>
      {provider === "resend" && (
        <SecretField
          label="Resend API Key"
          value={resendApiKey}
          onChange={setResendApiKey}
          placeholder="re_..."
          showValue={val(existing, "resend_api_key") ? "••••••••••••••••" : ""}
        />
      )}
      {provider === "smtp" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMTP Host">
            <input
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className={inputClass}
              placeholder="smtp.example.com"
            />
          </Field>
          <Field label="SMTP Port">
            <input
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              type="number"
              className={inputClass}
            />
          </Field>
          <Field label="SMTP Username">
            <input
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              className={inputClass}
            />
          </Field>
          <SecretField
            label="SMTP Password"
            hint="Now stored encrypted in the database."
            value={smtpPassword}
            onChange={setSmtpPassword}
            placeholder="Enter to update"
          />
        </div>
      )}
      <Field label="From Address">
        <input
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      {provider !== "log" && (
        <TestRow
          label="Send a test email to verify these settings"
          placeholder="you@example.com"
          withInput
          onTest={async (to) => {
            try {
              const r = await sdk.admin.testEmail(to);
              if (r.ok) toast.success(r.message);
              else toast.error(r.message);
            } catch {
              toast.error("Could not run the email test.");
            }
          }}
        />
      )}
    </IntegrationCard>
  );
}

function SmsIntegration({ existing }: { existing: SystemSetting[] }) {
  const [enabled, setEnabled] = useState(bool(existing, "sms_enabled", true));
  const [provider, setProvider] = useState(
    val(existing, "sms_provider", "log"),
  );
  const [apiKey, setApiKey] = useState(val(existing, "sms_api_key"));
  const [ethiopiaKey, setEthiopiaKey] = useState(
    val(existing, "smsethiopia_api_key"),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        sms_enabled: enabled ? "true" : "false",
        sms_provider: provider,
        sms_api_key: apiKey,
        smsethiopia_api_key: ethiopiaKey,
      });
      toast.success("SMS settings saved");
    } catch {
      toast.error("Failed to save SMS settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <IntegrationCard
      icon={Smartphone}
      title="SMS"
      description="Outbound SMS for balance reminders and customer messaging."
      enabled={enabled}
      onToggle={setEnabled}
      onSave={save}
      saving={saving}
    >
      <Field label="Provider">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          <option value="log">Log only (development)</option>
          <option value="africastalking">Africa's Talking</option>
          <option value="smsethiopia">SMS Ethiopia (smsethiopia.et)</option>
          <option value="twilio">Twilio</option>
        </select>
      </Field>
      {provider === "smsethiopia" ? (
        <SecretField
          label="SMS Ethiopia API Key"
          value={ethiopiaKey}
          onChange={setEthiopiaKey}
          placeholder="smsethiopia.et API key"
          showValue={val(existing, "smsethiopia_api_key") ? "••••••••••••••••" : ""}
        />
      ) : provider === "twilio" ? (
        <SecretField
          label="Twilio Key"
          hint="Format: accountSID:authToken"
          value={apiKey}
          onChange={setApiKey}
          placeholder="ACxxxx:your_auth_token"
          showValue={val(existing, "sms_api_key") ? "••••••••••••••••" : ""}
        />
      ) : provider === "africastalking" ? (
        <SecretField
          label="Africa's Talking API Key"
          value={apiKey}
          onChange={setApiKey}
          placeholder="AT API key"
          showValue={val(existing, "sms_api_key") ? "••••••••••••••••" : ""}
        />
      ) : (
        <p className="text-xs text-muted-foreground">
          Log mode prints messages to the server log — no key required.
        </p>
      )}
      <TestRow
        label="Send a test SMS to verify these settings"
        placeholder="0927646246"
        withInput
        onTest={async (to) => {
          try {
            const r = await sdk.admin.testSms(to);
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          } catch {
            toast.error("Could not run the SMS test.");
          }
        }}
      />
    </IntegrationCard>
  );
}

function AiIntegration({ existing }: { existing: SystemSetting[] }) {
  const [enabled, setEnabled] = useState(
    bool(existing, "chatbot_enabled", true),
  );
  const [endpoint, setEndpoint] = useState(
    val(existing, "chatbot_endpoint", "https://api.openai.com/v1"),
  );
  const [apiKey, setApiKey] = useState(val(existing, "chatbot_api_key"));
  const [model, setModel] = useState(
    val(existing, "chatbot_model", "gpt-4o-mini"),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        chatbot_enabled: enabled ? "true" : "false",
        chatbot_endpoint: endpoint,
        chatbot_api_key: apiKey,
        chatbot_model: model,
      });
      toast.success("AI assistant settings saved");
    } catch {
      toast.error("Failed to save AI settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <IntegrationCard
      icon={Bot}
      title="AI Assistant (Chatbot)"
      description="LLM provider for the shop-owner AI assistant. Any OpenAI-compatible API works."
      enabled={enabled}
      onToggle={setEnabled}
      onSave={save}
      saving={saving}
    >
      <Field label="API Endpoint URL">
        <input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          className={inputClass}
          placeholder="https://api.openai.com/v1"
        />
      </Field>
      <SecretField
        label="API Key"
        value={apiKey}
        onChange={setApiKey}
        placeholder="sk-..."
        showValue={val(existing, "chatbot_api_key") ? "••••••••••••••••" : ""}
      />
      <Field
        label="Model Name"
        hint="OpenAI, OpenRouter, Groq, Together — any compatible API."
      >
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
          placeholder="gpt-4o-mini"
        />
      </Field>
    </IntegrationCard>
  );
}

function ChapaIntegration({ existing }: { existing: SystemSetting[] }) {
  const [enabled, setEnabled] = useState(
    bool(existing, "chapa_enabled", false),
  );
  const [mode, setMode] = useState(val(existing, "chapa_mode", "test"));
  const [secretKey, setSecretKey] = useState(val(existing, "chapa_secret_key"));
  const [publicKey, setPublicKey] = useState(val(existing, "chapa_public_key"));
  const [webhookSecret, setWebhookSecret] = useState(
    val(existing, "chapa_webhook_secret"),
  );
  const [baseUrl, setBaseUrl] = useState(
    val(existing, "chapa_base_url", "https://api.chapa.co/v1"),
  );
  const [callbackUrl, setCallbackUrl] = useState(
    val(existing, "chapa_callback_url"),
  );
  const [returnUrl, setReturnUrl] = useState(val(existing, "chapa_return_url"));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        chapa_enabled: enabled ? "true" : "false",
        chapa_mode: mode,
        chapa_secret_key: secretKey,
        chapa_public_key: publicKey,
        chapa_webhook_secret: webhookSecret,
        chapa_base_url: baseUrl,
        chapa_callback_url: callbackUrl,
        chapa_return_url: returnUrl,
      });
      toast.success("Chapa settings saved");
    } catch {
      toast.error("Failed to save Chapa settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <IntegrationCard
      icon={CreditCard}
      title="Chapa Payment Gateway"
      description="Online subscription payments. The webhook activates the subscription automatically once Chapa confirms."
      enabled={enabled}
      onToggle={setEnabled}
      onSave={save}
      saving={saving}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mode">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={inputClass}
          >
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </Field>
        <Field label="Base URL">
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className={inputClass}
            placeholder="https://api.chapa.co/v1"
          />
        </Field>
        <SecretField
          label="Secret Key"
          value={secretKey}
          onChange={setSecretKey}
          placeholder="CHASECK_TEST-..."
          showValue={val(existing, "chapa_secret_key") ? "••••••••••••••••" : ""}
        />
        <SecretField
          label="Public Key"
          value={publicKey}
          onChange={setPublicKey}
          placeholder="CHAPUBK_TEST-..."
          showValue={val(existing, "chapa_public_key") ? "••••••••••••••••" : ""}
        />
        <SecretField
          label="Webhook Secret"
          hint="From your Chapa dashboard — used to verify webhook signatures."
          value={webhookSecret}
          onChange={setWebhookSecret}
          showValue={val(existing, "chapa_webhook_secret") ? "••••••••••••••••" : ""}
        />
        <Field label="Callback URL" hint="Chapa posts payment events here.">
          <input
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            className={inputClass}
            placeholder=".../api/v1/billing/chapa/callback"
          />
        </Field>
        <Field
          label="Return URL"
          hint="Where the customer lands after checkout."
        >
          <input
            value={returnUrl}
            onChange={(e) => setReturnUrl(e.target.value)}
            className={inputClass}
            placeholder=".../dashboard/billing/checkout/callback"
          />
        </Field>
      </div>
    </IntegrationCard>
  );
}

function TelegramIntegration({ existing }: { existing: SystemSetting[] }) {
  const [botToken, setBotToken] = useState(val(existing, "telegram_bot_token"));
  const [botUsername, setBotUsername] = useState(
    val(existing, "telegram_bot_username"),
  );
  const [chatId, setChatId] = useState(val(existing, "telegram_chat_id"));
  const [webhookUrl, setWebhookUrl] = useState(
    val(existing, "telegram_webhook_url"),
  );
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        telegram_bot_token: botToken,
        telegram_bot_username: botUsername.replace(/^@/, ""),
        telegram_chat_id: chatId,
        telegram_webhook_url: webhookUrl,
      });
      toast.success("Telegram settings saved");
    } catch {
      toast.error("Failed to save Telegram settings");
    } finally {
      setSaving(false);
    }
  }

  async function registerWebhook() {
    if (!webhookUrl.trim()) {
      toast.error("Enter the webhook URL first.");
      return;
    }
    setRegistering(true);
    try {
      const r = await sdk.admin.setTelegramWebhook(webhookUrl.trim());
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } catch {
      toast.error("Could not register the Telegram webhook.");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <IntegrationCard
      icon={MessageSquare}
      title="Telegram Bot"
      description="Admin alerts plus per-user and per-customer bot notifications."
      onSave={save}
      saving={saving}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SecretField
          label="Bot Token"
          value={botToken}
          onChange={setBotToken}
          placeholder="123456:ABC-DEF..."
          showValue={val(existing, "telegram_bot_token") ? "••••••••••••••••" : ""}
        />
        <Field label="Bot Username" hint="Used to build t.me connect links">
          <input
            value={botUsername}
            onChange={(e) => setBotUsername(e.target.value)}
            className={inputClass}
            placeholder="KasaShopBot"
          />
        </Field>
        <Field label="Admin Chat ID" hint="Where payment/admin alerts are sent">
          <input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className={inputClass}
            placeholder="-1001234567890"
          />
        </Field>
        <Field
          label="Webhook URL"
          hint="Public https URL ending in /api/v1/telegram/webhook"
        >
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className={inputClass}
            placeholder="https://api.example.com/api/v1/telegram/webhook"
          />
        </Field>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Register the webhook so the bot receives /start, /stats and /balance
        </p>
        <button
          type="button"
          onClick={registerWebhook}
          disabled={registering}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Plug className="h-4 w-4" />{" "}
          {registering ? "Registering…" : "Register Webhook"}
        </button>
      </div>
      <TestRow
        label="Send a test message to the configured admin chat"
        withInput={false}
        onTest={async () => {
          try {
            const r = await sdk.admin.testTelegram();
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          } catch {
            toast.error("Could not run the Telegram test.");
          }
        }}
      />
    </IntegrationCard>
  );
}

function WhatsAppIntegration({ existing }: { existing: SystemSetting[] }) {
  const [enabled, setEnabled] = useState(
    bool(existing, "whatsapp_enabled", false),
  );
  const [provider, setProvider] = useState(
    val(existing, "whatsapp_provider", "log"),
  );
  const [metaToken, setMetaToken] = useState(
    val(existing, "whatsapp_meta_access_token"),
  );
  const [metaPhoneId, setMetaPhoneId] = useState(
    val(existing, "whatsapp_meta_phone_number_id"),
  );
  const [metaVerifyToken, setMetaVerifyToken] = useState(
    val(existing, "whatsapp_meta_verify_token"),
  );
  const [twilioSid, setTwilioSid] = useState(
    val(existing, "whatsapp_twilio_sid"),
  );
  const [twilioToken, setTwilioToken] = useState(
    val(existing, "whatsapp_twilio_token"),
  );
  const [twilioFrom, setTwilioFrom] = useState(
    val(existing, "whatsapp_twilio_from"),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        whatsapp_enabled: enabled ? "true" : "false",
        whatsapp_provider: provider,
        whatsapp_meta_access_token: metaToken,
        whatsapp_meta_phone_number_id: metaPhoneId,
        whatsapp_meta_verify_token: metaVerifyToken,
        whatsapp_twilio_sid: twilioSid,
        whatsapp_twilio_token: twilioToken,
        whatsapp_twilio_from: twilioFrom,
      });
      toast.success("WhatsApp settings saved");
    } catch {
      toast.error("Failed to save WhatsApp settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <IntegrationCard
      icon={MessageSquare}
      title="WhatsApp"
      description="Outbound WhatsApp messages for customer reminders."
      enabled={enabled}
      onToggle={setEnabled}
      onSave={save}
      saving={saving}
    >
      <Field label="Provider">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className={inputClass}
        >
          <option value="log">Log only (development)</option>
          <option value="meta">Meta WhatsApp Cloud API</option>
          <option value="twilio">Twilio WhatsApp</option>
        </select>
      </Field>
      {provider === "meta" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SecretField
            label="Access Token"
            value={metaToken}
            onChange={setMetaToken}
            placeholder="EAAG..."
            showValue={val(existing, "whatsapp_meta_access_token") ? "••••••••••••••••" : ""}
          />
          <Field label="Phone Number ID">
            <input
              value={metaPhoneId}
              onChange={(e) => setMetaPhoneId(e.target.value)}
              className={inputClass}
              placeholder="1234567890"
            />
          </Field>
          <Field
            label="Webhook Verify Token"
            hint="Any string — enter the same value in the Meta dashboard"
          >
            <input
              value={metaVerifyToken}
              onChange={(e) => setMetaVerifyToken(e.target.value)}
              className={inputClass}
              placeholder="my-verify-token"
            />
          </Field>
        </div>
      )}
      {provider === "twilio" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account SID">
            <input
              value={twilioSid}
              onChange={(e) => setTwilioSid(e.target.value)}
              className={inputClass}
              placeholder="ACxxxx"
            />
          </Field>
          <SecretField
            label="Auth Token"
            value={twilioToken}
            onChange={setTwilioToken}
            placeholder="your_auth_token"
            showValue={val(existing, "whatsapp_twilio_token") ? "••••••••••••••••" : ""}
          />
          <Field label="WhatsApp From Number" hint="E.164, e.g. +14155238886">
            <input
              value={twilioFrom}
              onChange={(e) => setTwilioFrom(e.target.value)}
              className={inputClass}
              placeholder="+14155238886"
            />
          </Field>
        </div>
      )}
      {provider === "log" && (
        <p className="text-xs text-muted-foreground">
          Log mode prints messages to the server log — no keys required.
        </p>
      )}
      <TestRow
        label="Send a test WhatsApp message to verify these settings"
        placeholder="0927646246"
        withInput
        onTest={async (to) => {
          try {
            const r = await sdk.admin.testWhatsapp(to);
            if (r.ok) toast.success(r.message);
            else toast.error(r.message);
          } catch {
            toast.error("Could not run the WhatsApp test.");
          }
        }}
      />
    </IntegrationCard>
  );
}

function StorageIntegration({ existing }: { existing: SystemSetting[] }) {
  const [driver, setDriver] = useState(val(existing, "storage_driver", "local"));
  const [bucket, setBucket] = useState(val(existing, "s3_bucket"));
  const [region, setRegion] = useState(val(existing, "s3_region", "us-east-1"));
  const [endpoint, setEndpoint] = useState(val(existing, "s3_endpoint"));
  const [accessKey, setAccessKey] = useState(val(existing, "s3_access_key"));
  const [secretKey, setSecretKey] = useState("");
  const [blobToken, setBlobToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const entries: Record<string, string> = { storage_driver: driver };
      if (driver === "s3" || driver === "r2") {
        entries["s3_bucket"] = bucket;
        entries["s3_region"] = region;
        entries["s3_access_key"] = accessKey;
        if (endpoint) entries["s3_endpoint"] = endpoint;
        if (secretKey) entries["s3_secret_key"] = secretKey;
      } else if (driver === "vercel_blob") {
        if (blobToken) entries["vercel_blob_token"] = blobToken;
      }
      await saveSettings(entries);
      setSecretKey("");
      setBlobToken("");
      toast.success("Storage settings saved");
    } catch {
      toast.error("Failed to save storage settings");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    try {
      const r = await sdk.admin.testStorage();
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    } catch {
      toast.error("Could not run the storage test.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <IntegrationCard
      icon={HardDrive}
      title="File Storage"
      description="Store uploaded files and images. Driver and credentials are configurable here."
      onSave={save}
      saving={saving}
    >
      <Field label="Storage Provider">
        <select
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
          className={inputClass}
        >
          <option value="local">Local Disk (default)</option>
          <option value="s3">Amazon S3</option>
          <option value="r2">Cloudflare R2</option>
          <option value="vercel_blob">Vercel Blob</option>
        </select>
      </Field>
      {(driver === "s3" || driver === "r2") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bucket Name">
            <input
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className={inputClass}
              placeholder="my-bucket"
            />
          </Field>
          <Field label="Region">
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={inputClass}
              placeholder="us-east-1"
            />
          </Field>
          <Field label="Access Key ID">
            <input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className={inputClass}
            />
          </Field>
          <SecretField
            label="Secret Access Key"
            value={secretKey}
            onChange={setSecretKey}
            placeholder="Enter to update"
          />
          <Field label="Endpoint URL (optional)" hint="For R2 or MinIO">
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className={inputClass}
              placeholder="https://<account>.r2.cloudflarestorage.com"
            />
          </Field>
        </div>
      )}
      {driver === "vercel_blob" && (
        <SecretField
          label="Read/Write Token"
          value={blobToken}
          onChange={setBlobToken}
          placeholder="Enter to update"
        />
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={test}
          disabled={testing}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />{" "}
          {testing ? "Testing…" : "Test Connection"}
        </button>
      </div>
    </IntegrationCard>
  );
}

function IntegrationsTab({ existing }: { existing: SystemSetting[] }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        All third-party API keys live here. Each provider saves independently
        and overrides the matching environment variable at runtime.
      </p>
      <EmailIntegration existing={existing} />
      <SmsIntegration existing={existing} />
      <WhatsAppIntegration existing={existing} />
      <AiIntegration existing={existing} />
      <ChapaIntegration existing={existing} />
      <TelegramIntegration existing={existing} />
      <StorageIntegration existing={existing} />
    </div>
  );
}

// ─── Notifications Tab — targets + banners ────────────────────────────────────

function NotificationTargets({ existing }: { existing: SystemSetting[] }) {
  const [smsTo, setSmsTo] = useState(val(existing, "notify_payment_sms_to"));
  const [emailTo, setEmailTo] = useState(
    val(existing, "notify_payment_email_to"),
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveSettings({
        notify_payment_sms_to: smsTo,
        notify_payment_email_to: emailTo,
      });
      toast.success("Notification targets saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4" /> Payment Notification Targets
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        When a shop owner reports a payment, the admin is alerted on these
        channels. Telegram is used automatically when configured in
        Integrations.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SMS To (phone)">
          <input
            value={smsTo}
            onChange={(e) => setSmsTo(e.target.value)}
            className={inputClass}
            placeholder="+251 9XX XXX XXX"
          />
        </Field>
        <Field label="Email To">
          <input
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            type="email"
            className={inputClass}
            placeholder="admin@kasa.app"
          />
        </Field>
      </div>
      <div className="mt-5 flex justify-end border-t border-border pt-4">
        <SaveBtn onClick={save} saving={saving} />
      </div>
    </Card>
  );
}

interface BannerRow {
  id: string;
  message: string;
  type: string;
  shopId?: string | null;
  createdAt?: string;
}

function BannersSection() {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [shopId, setShopId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        sdk.admin.listBanners(),
        sdk.admin.listShops(),
      ]);
      setBanners(b as BannerRow[]);
      setShops(s as { id: string; name: string }[]);
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    try {
      await sdk.admin.createBanner({
        message: message.trim(),
        type,
        shopId: shopId || undefined,
      });
      toast.success("Banner created");
      setMessage("");
      setType("info");
      setShopId("");
      void fetchData();
    } catch {
      toast.error("Failed to create banner");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await sdk.admin.deleteBanner(id);
      toast.success("Banner removed");
      void fetchData();
    } catch {
      toast.error("Failed to remove banner");
    }
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Monitor className="h-4 w-4" /> Create Notification Banner
        </h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Message *">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              placeholder="Scheduled maintenance tonight from 2–4 AM…"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="danger">Danger</option>
              </select>
            </Field>
            <Field label="Scope">
              <select
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className={inputClass}
              >
                <option value="">Global (all shops)</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 hover:bg-primary/90"
            >
              {saving ? "Creating…" : "Create Banner"}
            </button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 text-sm font-semibold">
          Active Banners ({banners.length})
        </h3>
        {loading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active banners.</p>
        ) : (
          <div className="space-y-2">
            {banners.map((b) => (
              <div
                key={b.id}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                  b.type === "danger"
                    ? "border-destructive/20 bg-destructive/5"
                    : b.type === "warning"
                      ? "border-amber-300/40 bg-amber-100/30"
                      : "border-border bg-muted/20"
                }`}
              >
                <div className="flex-1">
                  <p>{b.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {b.type} · {b.shopId ? "Shop-scoped" : "Global"} ·{" "}
                    <FormattedDate iso={b.createdAt} />
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function NotificationsTab({ existing }: { existing: SystemSetting[] }) {
  return (
    <div className="space-y-6">
      <NotificationTargets existing={existing} />
      <BannersSection />
    </div>
  );
}

// ─── Active Sessions ──────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await sdk.admin.listActiveSessions());
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await sdk.admin.revokeSession(id);
      toast.success("Session revoked");
      void fetchSessions();
    } catch {
      toast.error("Failed to revoke");
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <Card className="p-5">
      {sessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No active sessions
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="pb-2 pr-4">User</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">User Agent</th>
                <th className="pb-2 pr-4">IP</th>
                <th className="pb-2 pr-4">Created</th>
                <th className="pb-2 pr-4">Expires</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{s.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.userEmail}
                    </p>
                  </td>
                  <td className="py-2.5 pr-4">{s.userRole}</td>
                  <td
                    className="max-w-45 truncate py-2.5 pr-4 text-xs text-muted-foreground"
                    title={s.userAgent}
                  >
                    {s.userAgent}
                  </td>
                  <td className="py-2.5 pr-4 text-muted-foreground">
                    {s.ipAddress}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-muted-foreground">
                    <FormattedDate iso={s.createdAt} />
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-muted-foreground">
                    <FormattedDate iso={s.expiresAt} />
                  </td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => handleRevoke(s.id)}
                      disabled={revokingId === s.id}
                      className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60 hover:bg-destructive/90"
                    >
                      {revokingId === s.id ? "…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Audit Summary ────────────────────────────────────────────────────────────

function AuditTab() {
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    sdk.admin
      .getAuditLogSummary()
      .then(setSummary)
      .catch(() => toast.error("Failed to load audit summary"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-64 rounded-xl" />;
  if (!summary) return <p className="text-sm text-muted-foreground">No data</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="text-2xl font-bold tabular-nums">
            {summary.totalLogs.toLocaleString()}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Last 24h</p>
          <p className="text-2xl font-bold tabular-nums">
            {summary.recent24h.toLocaleString()}
          </p>
        </Card>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            By Action
          </h4>
          <div className="space-y-2">
            {summary.byAction.map((a) => (
              <div key={a.action} className="flex justify-between text-sm">
                <span>{a.action}</span>
                <span className="tabular-nums text-muted-foreground">
                  {a.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            By Entity
          </h4>
          <div className="space-y-2">
            {summary.byEntity.map((e) => (
              <div key={e.entityType} className="flex justify-between text-sm">
                <span>{e.entityType}</span>
                <span className="tabular-nums text-muted-foreground">
                  {e.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId =
  | "general"
  | "security"
  | "integrations"
  | "notifications"
  | "sessions"
  | "audit";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: Globe },
  { id: "security", label: "Security", icon: Lock },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "sessions", label: "Active Sessions", icon: Key },
  { id: "audit", label: "Audit Summary", icon: Activity },
];

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    sdk.admin
      .listSystemSettings()
      .then(setSettings)
      .catch(() => toast.error("Failed to load system settings"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Administration"
        description="Platform configuration, security policy, and third-party integrations"
        breadcrumb={["Platform", "Administration"]}
      />

      <div className="flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <>
          {activeTab === "general" && <GeneralTab existing={settings} />}
          {activeTab === "security" && <SecurityTab existing={settings} />}
          {activeTab === "integrations" && (
            <IntegrationsTab existing={settings} />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab existing={settings} />
          )}
          {activeTab === "sessions" && <SessionsTab />}
          {activeTab === "audit" && <AuditTab />}
        </>
      )}
    </div>
  );
}
