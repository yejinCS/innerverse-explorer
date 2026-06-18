// 20 · 알림 센터
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatusBar, AppBar, Body } from "../ui/layout";
import { Card } from "../ui/primitives";
import { useAppStore } from "@/store/appStore";

const ICONS: Record<string, string> = {
  letter: "💌",
  attendance: "🌙",
  friend: "🪐",
  review: "✦",
};

const ROUTES: Record<string, string> = {
  letter: "/letter",
  attendance: "/attendance",
  friend: "/friend/add",
  review: "/review",
};

export default function Notifications() {
  const nav = useNavigate();
  const list = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotifsRead);

  useEffect(() => {
    const t = window.setTimeout(markRead, 600);
    return () => window.clearTimeout(t);
  }, [markRead]);

  return (
    <>
      <StatusBar />
      <AppBar back title="알림" />
      <Body>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--iv-txt3)", padding: 40 }}>
            새 알림이 없어요.
          </div>
        ) : (
          list.map((n) => (
            <Card key={n.id} size="sm" onClick={() => nav(ROUTES[n.type] ?? "/home")}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: "rgba(163,148,247,.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flex: "0 0 38px",
                  }}
                >
                  {ICONS[n.type] ?? "•"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{n.title}</div>
                    {n.unread && (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#e87fb8",
                          flex: "0 0 auto",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--iv-txt2)", marginTop: 3, lineHeight: 1.55 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--iv-txt3)", marginTop: 4 }}>{n.time}</div>
                </div>
              </div>
            </Card>
          ))
        )}
      </Body>
    </>
  );
}
