import React, { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

// ── Button ────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "default" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, children, className, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-[10px] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98] cursor-pointer";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-slate-200/60",
    ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
    outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-2xs",
  };
  const sizes = {
    xs: "text-xs px-2.5 h-7 gap-1 font-medium",
    sm: "text-xs px-3 h-8 gap-1.5 font-medium",
    md: "text-sm px-4 h-9 gap-2 font-medium",
    lg: "text-sm px-5 h-10 gap-2 font-semibold",
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && (
        <svg className="animate-spin size-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-9 rounded-[10px] border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150",
            error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ── Select ────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative w-full group">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full h-9 appearance-none rounded-[10px] border border-slate-200 bg-white px-3.5 pr-9 text-sm font-medium text-slate-900 shadow-2xs",
              "hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-150 cursor-pointer",
              error && "border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} className="py-2 text-slate-900 bg-white font-medium">
                {o.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 transition-colors">
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-200/80 shadow-2xs transition-all duration-150",
        hover && "cursor-pointer hover:border-slate-300 hover:shadow-xs",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-5 pt-5 pb-3 border-b border-slate-100", className)}>{children}</div>;
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-slate-900 tracking-tight", className)}>{children}</h3>;
}

// ── Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  preventClose?: boolean;
}

export function Modal({ open, isOpen, onClose, title, children, size = "md", preventClose = false }: ModalProps) {
  const isVisible = open ?? isOpen ?? false;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !preventClose) onClose();
    };
    if (isVisible) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isVisible, onClose, preventClose]);

  if (!isVisible) return null;
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={preventClose ? undefined : onClose} />
      <div className={cn("relative w-full bg-white rounded-2xl shadow-xl border border-slate-200/90 flex flex-col max-h-[90vh] overflow-hidden transition-all", widths[size])}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            {!preventClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "silver" | "bronze" | "success" | "warning" | "destructive" | "muted" | "outline";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-800 border border-slate-200/80",
    gold: "bg-amber-50 text-amber-800 border border-amber-200",
    silver: "bg-slate-100 text-slate-700 border border-slate-200",
    bronze: "bg-orange-50 text-orange-800 border border-orange-200",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    destructive: "bg-red-50 text-red-700 border border-red-200",
    muted: "bg-slate-100 text-slate-600 border border-slate-200/60",
    outline: "border border-slate-200 text-slate-700 bg-white",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-tight", variants[variant as keyof typeof variants] ?? variants.default, className)}>
      {children}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, sub, icon, accent }: StatCardProps) {
  return (
    <Card className={cn("p-5", accent && "border-primary/20 bg-gradient-to-br from-white to-rose-50/20")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 font-medium truncate">{sub}</p>}
        </div>
        {icon && <div className={cn("shrink-0 p-2.5 rounded-lg", accent ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600")}>{icon}</div>}
      </div>
    </Card>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-2xs">
      <table className={cn("w-full text-sm border-collapse", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/80 sticky top-0", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("py-3.5 px-4 text-slate-800 border-b border-slate-100 hover:bg-slate-50/70 transition-colors", className)}>{children}</td>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <svg className="size-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 font-normal leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin size-5 text-muted-foreground", className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Delete", loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="size-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
          <svg className="size-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────

interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const styles = {
    info: "bg-slate-50 border-slate-200 text-slate-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-rose-50 border-rose-200 text-rose-900",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-xs", styles[variant], className)}>
      {title && <p className="font-semibold text-xs tracking-wide uppercase opacity-80 mb-1">{title}</p>}
      <div className="text-slate-700 font-medium">{children}</div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────

interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs({ tabs, active, onChange, className, ariaLabel = "Content views" }: TabsProps) {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === active));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const currentIndex = Math.max(0, tabs.findIndex((tab) => tab.id === active));
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;

    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    const tabList = event.currentTarget;
    onChange(nextTab.id);
    requestAnimationFrame(() => {
      tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
    });
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("relative isolate grid w-fit overflow-hidden rounded-xl bg-muted p-1", className)}
      style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        data-tab-indicator
        className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-lg bg-card shadow-sm ring-1 ring-slate-200/60 transition-transform duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${Math.max(tabs.length, 1)})`,
          transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
        }}
      />
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => {
              if (!isActive) onChange(tab.id);
            }}
            className={cn(
              "relative z-10 min-w-0 rounded-lg px-4 py-1.5 text-sm font-medium outline-none transition-[color,background-color,transform] duration-150 ease-out",
              "hover:bg-white/30 active:bg-white/45 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
              "motion-reduce:transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface AnimatedTabPanelProps {
  activeKey: string;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedTabPanel({ activeKey, children, className }: AnimatedTabPanelProps) {
  return (
    <div className={cn("relative isolate", className)}>
      <div key={activeKey} role="tabpanel" className="tab-panel-fast">
        {children}
      </div>
    </div>
  );
}
// ── Toggle ────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-10 h-5.5 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-switch-background"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 size-4.5 bg-white rounded-full shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </div>
      {label && <span className="text-sm text-foreground">{label}</span>}
    </label>
  );
}

// ── Search ────────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────

interface DropdownItem {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
}

export function Dropdown({ trigger, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      {open && (
        <div className="absolute right-0 mt-1.5 w-44 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer select-none",
                item.destructive
                  ? "text-destructive hover:bg-destructive/10 active:bg-destructive/20"
                  : "text-foreground hover:bg-muted active:bg-muted/80"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Grade Badge ───────────────────────────────────────────────────────────

export function GradeBadge({ grade }: { grade: number }) {
  const cls =
    grade >= 95 ? "bg-indigo-600 text-white" :
    grade >= 90 ? "bg-emerald-600 text-white" :
    grade >= 85 ? "bg-amber-500 text-white" :
    grade >= 75 ? "bg-slate-500 text-white" : "bg-red-600 text-white";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tabular-nums ${cls}`}>
      {grade.toFixed(0)}
    </span>
  );
}

// ── Award Icon ────────────────────────────────────────────────────────────

export function AwardDisplay({ award, reason }: { award: string | null; reason?: string }) {
  if (!award) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge variant="muted">No Award</Badge>
        {reason && (
          <p className="text-[10px] text-muted-foreground leading-tight text-center max-w-[140px]">{reason}</p>
        )}
      </div>
    );
  }
  const variant = award.includes("Gold") ? "gold" : award.includes("Silver") ? "silver" : "bronze";
  const medal = award.includes("Gold") ? "🥇" : award.includes("Silver") ? "🥈" : "🥉";
  return <Badge variant={variant}>{medal} {award}</Badge>;
}
