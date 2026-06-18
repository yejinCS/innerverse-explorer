// 카드 / 칩 / 버튼 / 캡션 라벨 — 화면 전반에서 재사용.
import { ReactNode, ButtonHTMLAttributes } from "react";

export function Card({
  children,
  variant = "default",
  size = "md",
  className,
  onClick,
}: {
  children: ReactNode;
  variant?: "default" | "purple";
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
}) {
  const cls = [
    "iv-card",
    size === "sm" ? "iv-card-sm" : "",
    variant === "purple" ? "iv-card-purple" : "",
    onClick ? "iv-card-tap" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter") onClick();
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`iv-chip${active ? " on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  block?: boolean;
}

export function Button({
  variant = "primary",
  block,
  className,
  children,
  ...rest
}: BtnProps) {
  const cls = [
    "iv-btn",
    variant === "primary" ? "iv-btn-primary" : "iv-btn-ghost",
    block ? "iv-btn-block" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function CapLabel({ children }: { children: ReactNode }) {
  return <div className="iv-cap">{children}</div>;
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className={`iv-toggle${on ? " on" : ""}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="iv-toggle-knob" />
    </button>
  );
}
