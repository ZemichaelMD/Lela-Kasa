import { MoreHorizontal } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/ui";

export interface ActionMenuItem {
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: false;
}

export interface ActionMenuDivider {
  divider: true;
}

export type ActionMenuEntry = ActionMenuItem | ActionMenuDivider;

interface ActionMenuProps {
  items: ActionMenuEntry[];
  align?: "left" | "right";
  label?: string;
}

/**
 * Accessible three-dot action menu. Renders via React portal so the dropdown
 * escapes any overflow:hidden/overflow-x-auto ancestors (tables, cards, etc.).
 */
export function ActionMenu({
  items,
  align = "right",
  label = "Row actions",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const style: React.CSSProperties = {
      position: "fixed",
      top: rect.bottom + 4,
      zIndex: 9999,
    };
    if (align === "right") {
      style.right = window.innerWidth - rect.right;
    } else {
      style.left = rect.left;
    }
    setMenuStyle(style);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const dropdownNode = open
    ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={menuStyle}
          className="min-w-48 rounded-lg border border-border bg-popover p-1 text-sm shadow-md"
        >
          {items.map((entry, idx) => {
            if ("divider" in entry && entry.divider) {
              return <div key={`d-${idx}`} className="my-1 h-px bg-border" />;
            }
            const item = entry as ActionMenuItem;
            const Icon = item.icon;
            const body = (
              <>
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span className="flex-1 text-left">{item.label}</span>
              </>
            );
            const className = cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
              item.danger
                ? "text-destructive hover:bg-destructive/10"
                : "hover:bg-accent",
              item.disabled && "pointer-events-none opacity-50",
            );
            if (item.href) {
              return (
                <a
                  key={idx}
                  ref={idx === 0 ? (firstItemRef as never) : undefined}
                  href={item.href}
                  role="menuitem"
                  className={className}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                >
                  {body}
                </a>
              );
            }
            return (
              <button
                key={idx}
                ref={idx === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                className={className}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {body}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {dropdownNode}
    </div>
  );
}
