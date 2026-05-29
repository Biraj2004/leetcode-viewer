"use client";

/**
 * Toast.tsx
 *
 * Lightweight, self-dismissing toast notification component.
 * Uses a module-level event bus — call toast.error("msg") from anywhere.
 */

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number;
}

// ─── Event bus ────────────────────────────────────────────────────────────────

type ToastListener = (item: Omit<ToastItem, "id">) => void;
let _listener: ToastListener | null = null;
let _idCounter = 0;

export const toast = {
  show(message: string, variant: ToastVariant = "info", duration = 5000) {
    _listener?.({ message, variant, duration });
  },
  success(message: string, duration = 4000) { this.show(message, "success", duration); },
  error(message: string, duration = 7000)   { this.show(message, "error",   duration); },
  warning(message: string, duration = 5000) { this.show(message, "warning", duration); },
  info(message: string, duration = 4000)    { this.show(message, "info",    duration); },
};

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  { bg: string; border: string; icon: React.ReactNode; color: string }
> = {
  success: {
    bg: "rgba(30,40,30,0.97)",
    border: "rgba(166,227,161,0.4)",
    color: "#a6e3a1",
    icon: <CheckCircle size={16} />,
  },
  error: {
    bg: "rgba(40,20,25,0.97)",
    border: "rgba(243,139,168,0.4)",
    color: "#f38ba8",
    icon: <AlertCircle size={16} />,
  },
  warning: {
    bg: "rgba(40,35,15,0.97)",
    border: "rgba(249,226,175,0.4)",
    color: "#f9e2af",
    icon: <AlertTriangle size={16} />,
  },
  info: {
    bg: "rgba(20,30,45,0.97)",
    border: "rgba(137,180,250,0.4)",
    color: "#89b4fa",
    icon: <Info size={16} />,
  },
};

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const cfg = VARIANT_CONFIG[item.variant];

  // Slide-in
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => onDismiss(item.id), 300);
    }, item.duration);
    return () => window.clearTimeout(t);
  }, [item.id, item.duration, onDismiss]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => onDismiss(item.id), 300);
  }, [item.id, onDismiss]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${cfg.border}`,
        backgroundColor: cfg.bg,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        maxWidth: 380,
        minWidth: 260,
        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
        transform: visible ? "translateX(0)" : "translateX(110%)",
        opacity: visible ? 1 : 0,
        pointerEvents: "all",
      }}
    >
      <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>

      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: 13,
          color: "#cdd6f4",
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {item.message}
      </p>

      <button
        onClick={handleClose}
        style={{
          background: "none",
          border: "none",
          padding: 2,
          cursor: "pointer",
          color: "#585b70",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          borderRadius: 4,
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _listener = (item) => {
      const id = ++_idCounter;
      setItems((prev) => [...prev, { ...item, id }]);
    };
    return () => { _listener = null; };
  }, []);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}
