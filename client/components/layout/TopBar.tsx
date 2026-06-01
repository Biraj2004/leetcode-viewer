"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Upload,
  Settings,
  CircleUser,
  Flame,
  Search,
  X,
  Puzzle,
  RefreshCw,
} from "lucide-react";
import { DifficultyBadge } from "../ui/Badge";
import type { ParsedProblem } from "../../types/ui";
import { detectExtension } from "../../lib/extensionApi";

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [extStatus, setExtStatus] = useState<"unknown" | "found" | "missing">("unknown");
  const [loginStatus, setLoginStatus] = useState<"unknown" | "logged_in" | "logged_out">("unknown");
  const [lastCsrfRefreshAt, setLastCsrfRefreshAt] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("Checking extension...");
  const [refreshing, setRefreshing] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [extProbeVersion, setExtProbeVersion] = useState(0);

  const handleRefreshExtensionStatus = useCallback(() => {
    setExtProbeVersion((value) => value + 1);
    setStatusText("Re-checking extension...");
  }, []);

  const handleLoginViaExtension = useCallback(() => {
    setLoggingIn(true);
    setStatusText("Opening LeetCode login...");
    window.postMessage({ type: "LV_EXT_REQ_LOGIN" }, "*");
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "LV_EXT_RESP_LOGIN") {
        setLoggingIn(false);

        const resp = msg.data as {
          success?: boolean;
          loggedIn?: boolean;
          alreadyLoggedIn?: boolean;
          createdTab?: boolean;
          lastCsrfRefreshAt?: number;
          error?: string;
          message?: string;
        } | undefined;

        if (!resp?.success) {
          setLoginStatus("logged_out");
          setStatusText(resp?.message ?? resp?.error ?? msg.error ?? "Failed to complete LeetCode login.");
          return;
        }

        setLoginStatus("logged_in");
        if (typeof resp.lastCsrfRefreshAt === "number" && resp.lastCsrfRefreshAt > 0) {
          setLastCsrfRefreshAt(resp.lastCsrfRefreshAt);
        }

        if (resp.alreadyLoggedIn) {
          setStatusText("LeetCode login already active.");
          return;
        }

        setStatusText(
          resp.createdTab
            ? "Login detected. Temporary login tab closed automatically."
            : "Login detected from existing LeetCode tab.",
        );
        return;
      }

      if (msg.type !== "LV_EXT_RESP_CHECK") return;
      setRefreshing(false);

      const resp = msg.data as {
        success?: boolean;
        loggedIn?: boolean;
        lastCsrfRefreshAt?: number;
        error?: string;
      } | undefined;

      if (!resp?.success) {
        setLoginStatus("unknown");
        setStatusText(resp?.error ?? msg.error ?? "Failed to verify LeetCode login.");
        return;
      }

      setLoginStatus(resp.loggedIn ? "logged_in" : "logged_out");
      if (typeof resp.lastCsrfRefreshAt === "number" && resp.lastCsrfRefreshAt > 0) {
        setLastCsrfRefreshAt(resp.lastCsrfRefreshAt);
      }

      setStatusText(
        resp.loggedIn
          ? "LeetCode login detected."
          : "Not logged into LeetCode in this browser profile. Please login on leetcode.com.",
      );
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probeExtensionAndLogin() {
      setExtStatus("unknown");
      setRefreshing(true);
      const immediateFound = await detectExtension(8, 220, 500);
      if (cancelled) return;

      if (immediateFound) {
        setExtStatus("found");
        setStatusText("Checking LeetCode login...");
        window.postMessage({ type: "LV_EXT_REQ_CHECK" }, "*");
        return;
      }

      setExtStatus("missing");
      setRefreshing(false);
      setLoginStatus("unknown");
      setStatusText("Extension not detected.");

      for (let i = 0; i < 6; i++) {
        await new Promise((resolve) => window.setTimeout(resolve, 1800));
        if (cancelled) return;
        const found = await detectExtension(2, 250, 450);
        if (cancelled) return;
        if (!found) continue;

        setExtStatus("found");
        setRefreshing(true);
        setStatusText("Extension detected. Checking LeetCode login...");
        window.postMessage({ type: "LV_EXT_REQ_CHECK" }, "*");
        return;
      }
    }

    probeExtensionAndLogin();
    return () => {
      cancelled = true;
    };
  }, [extProbeVersion]);

  const loginLabel = loginStatus === "logged_in"
    ? "Logged in"
    : loginStatus === "logged_out"
      ? "Not logged in"
      : "Checking...";

  const loginColor = loginStatus === "logged_in"
    ? "#a6e3a1"
    : loginStatus === "logged_out"
      ? "#f38ba8"
      : "#f9e2af";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 50,
          animation: "backdropFadeIn 0.2s ease-out forwards",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 51,
          width: "min(460px,92vw)",
          backgroundColor: "#1e1e2e",
          border: "1px solid #313244",
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #313244",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings size={16} style={{ color: "#89b4fa" }} />
            <span style={{ color: "#cdd6f4", fontSize: 15, fontWeight: 700 }}>Settings</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6c7086",
              display: "flex",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ borderRadius: 8, border: "1px solid #313244", overflow: "hidden" }}>
            <div
              style={{
                padding: "10px 14px",
                background: "#181825",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Puzzle size={14} style={{ color: extStatus === "found" ? "#a6e3a1" : "#6c7086" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#cdd6f4" }}>Browser Extension</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background: extStatus === "found" ? "rgba(166,227,161,0.15)" : "rgba(243,139,168,0.12)",
                    color: extStatus === "found" ? "#a6e3a1" : "#f38ba8",
                    border: extStatus === "found"
                      ? "1px solid rgba(166,227,161,0.3)"
                      : "1px solid rgba(243,139,168,0.25)",
                  }}
                >
                  {extStatus === "found" ? "Detected" : extStatus === "missing" ? "Not found" : "Checking..."}
                </span>
                <button
                  onClick={handleRefreshExtensionStatus}
                  title="Re-check extension"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: "1px solid #313244",
                    background: "#1e1e2e",
                    color: "#a6adc8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                </button>
              </div>
            </div>

            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {extStatus !== "found" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a
                      href="https://github.com/Biraj2004/leetcode-viewer/releases/download/release/extension.zip"
                      download
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "#89b4fa",
                        textDecoration: "none",
                        padding: "6px 10px",
                        borderRadius: 6,
                        background: "rgba(137,180,250,0.1)",
                        border: "1px solid rgba(137,180,250,0.2)",
                      }}
                    >
                      <Puzzle size={12} /> Download ZIP
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("chrome://extensions/");
                        const btn = document.getElementById("copy-ext-btn");
                        if (!btn) return;
                        const oldText = btn.innerText;
                        btn.innerText = "Copied!";
                        setTimeout(() => {
                          btn.innerText = oldText;
                        }, 2000);
                      }}
                      id="copy-ext-btn"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        color: "#a6adc8",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #313244",
                        background: "#181825",
                        cursor: "pointer",
                      }}
                    >
                      Copy chrome://extensions
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 10, color: "#a6adc8", lineHeight: 1.4 }}>
                    Download the ZIP, open chrome://extensions, enable Developer Mode, and click Load Unpacked.
                  </p>
                </div>
              )}

              <div style={{ border: "1px solid #313244", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#6c7086" }}>LeetCode Login</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: loginColor }}>{loginLabel}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#6c7086" }}>CSRF Auto Refresh</span>
                  <span style={{ fontSize: 11, color: "#a6adc8" }}>
                    {lastCsrfRefreshAt ? new Date(lastCsrfRefreshAt).toLocaleTimeString() : "Not refreshed yet"}
                  </span>
                </div>
              </div>

              {extStatus === "found" && loginStatus !== "logged_in" && (
                <button
                  onClick={handleLoginViaExtension}
                  disabled={loggingIn}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 6,
                    border: "none",
                    cursor: loggingIn ? "not-allowed" : "pointer",
                    background: "#ffa116",
                    color: "#1e1e2e",
                    fontWeight: 600,
                    fontSize: 12,
                    opacity: loggingIn ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={12} style={{ animation: loggingIn ? "spin 1s linear infinite" : "none" }} />
                  {loggingIn ? "Waiting for Login..." : "Login via Extension"}
                </button>
              )}

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: loginStatus === "logged_out" ? "#f38ba8" : "#a6adc8",
                }}
              >
                {statusText}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #313244",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
              borderRadius: 7,
              border: "1px solid #313244",
              background: "transparent",
              color: "#a6adc8",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

interface TopBarProps {
  problem: ParsedProblem;
  problems: ParsedProblem[];
  problemIndex: number;
  totalProblems: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectProblem: (index: number) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
}

export function TopBar({
  problem,
  problems,
  problemIndex,
  totalProblems,
  onPrev,
  onNext,
  onSelectProblem,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
}: TopBarProps) {
  const DRAWER_ANIMATION_MS = 220;
  const [timerActive, setTimerActive] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive]);

  useEffect(() => {
    if (isDrawerVisible || !isDrawerMounted) return;
    const timeoutId = window.setTimeout(() => setIsDrawerMounted(false), DRAWER_ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isDrawerVisible, isDrawerMounted]);

  useEffect(() => {
    if (!isDrawerVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawerVisible]);

  useEffect(() => {
    const sendHeartbeat = () => {
      window.postMessage({ type: "LV_EXT_APP_HEARTBEAT" }, "*");
    };
    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredProblems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return problems;
    return problems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(query);
      const slugMatch = item.titleSlug.toLowerCase().includes(query);
      return titleMatch || slugMatch;
    });
  }, [problems, searchQuery]);

  const problemIndexBySlug = useMemo(() => {
    const map = new Map<string, number>();
    problems.forEach((item, index) => map.set(item.titleSlug, index));
    return map;
  }, [problems]);

  function openDrawer() {
    setIsDrawerMounted(true);
    window.setTimeout(() => setIsDrawerVisible(true), 10);
  }

  function closeDrawer() {
    setIsDrawerVisible(false);
  }

  function toggleDrawer() {
    if (isDrawerVisible) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function formatTime(value: number): string {
    const h = String(Math.floor(value / 3600)).padStart(2, "0");
    const m = String(Math.floor((value % 3600) / 60)).padStart(2, "0");
    const s = String(value % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  const iconBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 6,
    borderRadius: 6,
    color: "#6c7086",
  };

  const isFirst = problemIndex === 0;
  const isLast = problemIndex === totalProblems - 1;

  return (
    <>
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      <header
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          backgroundColor: "#1e1e2e",
          borderBottom: "1px solid #313244",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div
              style={{
                width: 26,
                height: 26,
                backgroundColor: "#ffa116",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#1e1e2e", fontWeight: 800, fontSize: 12 }}>LV</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ color: "#cdd6f4", fontWeight: 600, fontSize: 14, lineHeight: 1.1 }}>Leetcode Viewer</span>
              <span style={{ color: "#a6adc8", fontSize: 9, lineHeight: 1, fontFamily: "monospace" }}>
                v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
              </span>
            </div>
          </a>

          <div style={{ width: 1, height: 20, backgroundColor: "#313244" }} />

          <button
            style={{
              ...iconBtn,
              color: isDrawerVisible ? "#89b4fa" : iconBtn.color,
              backgroundColor: isDrawerVisible ? "rgba(137,180,250,0.12)" : "transparent",
            }}
            title="Problem list"
            onClick={toggleDrawer}
          >
            <List size={17} />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#313244",
              borderRadius: 8,
              padding: "2px",
              gap: 2,
            }}
          >
            <button
              onClick={onPrev}
              disabled={isFirst}
              title="Previous problem"
              style={{
                ...iconBtn,
                padding: 4,
                opacity: isFirst ? 0.35 : 1,
                cursor: isFirst ? "not-allowed" : "pointer",
              }}
            >
              <ChevronLeft size={15} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 6px" }}>
              <span
                style={{
                  color: "#a6adc8",
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {problemIndex + 1}. {problem.title}
              </span>
              <DifficultyBadge difficulty={problem.difficulty} />
            </div>

            <button
              onClick={onNext}
              disabled={isLast}
              title="Next problem"
              style={{
                ...iconBtn,
                padding: 4,
                opacity: isLast ? 0.35 : 1,
                cursor: isLast ? "not-allowed" : "pointer",
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button style={{ ...iconBtn, gap: 4, fontSize: 12, fontWeight: 500 }} title="Streak">
            <Flame size={14} style={{ color: "#f9e2af" }} />
            <span style={{ color: "#a6adc8" }}>0</span>
          </button>
        </div>

        <button
          onClick={() => setTimerActive(!timerActive)}
          title={timerActive ? "Pause timer" : "Start timer"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 14px",
            borderRadius: 20,
            border: timerActive ? "1px solid #89b4fa" : "1px solid #45475a",
            backgroundColor: timerActive ? "rgba(137,180,250,0.1)" : "transparent",
            color: timerActive ? "#89b4fa" : "#6c7086",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "monospace",
          }}
        >
          <Clock size={13} />
          <span>{formatTime(seconds)}</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onRun}
            disabled={isRunning}
            title="Run code (active test case)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#313244",
              color: "#cdd6f4",
              cursor: isRunning ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 500,
              opacity: isRunning ? 0.5 : 1,
            }}
          >
            <Play size={14} style={{ color: "#a6e3a1" }} />
            {isRunning ? "Running..." : "Run"}
          </button>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            title="Submit solution (all test cases)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              backgroundColor: "#ffa116",
              color: "#1e1e2e",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            <Upload size={14} />
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>

          <button
            style={{
              ...iconBtn,
              color: isSettingsOpen ? "#89b4fa" : iconBtn.color,
              backgroundColor: isSettingsOpen ? "rgba(137,180,250,0.12)" : "transparent",
            }}
            title="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings size={17} />
          </button>

          <button
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#45475a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
            }}
            title="Profile"
          >
            <CircleUser size={17} style={{ color: "#a6adc8" }} />
          </button>
        </div>
      </header>

      {isDrawerMounted && (
        <>
          <button
            onClick={closeDrawer}
            aria-label="Close problem drawer"
            style={{
              position: "fixed",
              inset: 0,
              top: 48,
              backgroundColor: "rgba(0,0,0,0.45)",
              opacity: isDrawerVisible ? 1 : 0,
              transition: `opacity ${DRAWER_ANIMATION_MS}ms ease`,
              border: "none",
              padding: 0,
              margin: 0,
              zIndex: 20,
              cursor: "pointer",
            }}
          />

          <aside
            style={{
              position: "fixed",
              top: 48,
              left: 0,
              bottom: 0,
              width: "min(360px, 90vw)",
              backgroundColor: "#1e1e2e",
              borderRight: "1px solid #313244",
              zIndex: 21,
              display: "flex",
              flexDirection: "column",
              boxShadow: "6px 0 24px rgba(0,0,0,0.35)",
              transform: isDrawerVisible ? "translateX(0)" : "translateX(-100%)",
              opacity: isDrawerVisible ? 1 : 0,
              transition: `transform ${DRAWER_ANIMATION_MS}ms ease, opacity ${DRAWER_ANIMATION_MS}ms ease`,
            }}
          >
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #313244" }}>
              <div style={{ color: "#cdd6f4", fontSize: 14, fontWeight: 700 }}>All Questions</div>
              <div style={{ color: "#6c7086", fontSize: 12, marginTop: 4 }}>
                {totalProblems} problem{totalProblems === 1 ? "" : "s"}
              </div>
            </div>

            <div style={{ padding: "10px 10px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid #313244",
                  borderRadius: 8,
                  backgroundColor: "#181825",
                  padding: "8px 10px",
                }}
              >
                <Search size={14} style={{ color: "#6c7086" }} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search questions..."
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#cdd6f4",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: 10 }}>
              {filteredProblems.length === 0 && (
                <div style={{ color: "#6c7086", fontSize: 13, textAlign: "center", padding: "26px 10px" }}>
                  No questions found.
                </div>
              )}
              {filteredProblems.map((item) => {
                const realIndex = problemIndexBySlug.get(item.titleSlug) ?? -1;
                if (realIndex < 0) return null;
                const active = realIndex === problemIndex;
                return (
                  <button
                    key={item.titleSlug}
                    onClick={() => {
                      onSelectProblem(realIndex);
                      closeDrawer();
                    }}
                    style={{
                      width: "100%",
                      border: active ? "1px solid #89b4fa" : "1px solid #313244",
                      backgroundColor: active ? "rgba(137,180,250,0.14)" : "#181825",
                      borderRadius: 10,
                      padding: "10px 12px",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    title={item.title}
                  >
                    <span
                      style={{
                        color: active ? "#cdd6f4" : "#a6adc8",
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {realIndex + 1}. {item.title}
                    </span>
                    <DifficultyBadge difficulty={item.difficulty} />
                  </button>
                );
              })}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
