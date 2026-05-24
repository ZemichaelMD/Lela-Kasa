import { useI18n } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "am" : "en")}
      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-background hover:text-forground hover:bg-accent transition-colors"
      title="Switch language / ቋንቋ ቀይር"
    >
      {lang === "en" ? "አማ" : "EN"}
    </button>
  );
}
