"use client";

/**
 * TopBar.tsx
 * Global navigation bar.
 * Shows logo, problem prev/next nav, timer, run/submit, settings.
 */

import { useState, useEffect, useRef, useMemo } from "react";
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
} from "lucide-react";
import { DifficultyBadge } from "../ui/Badge";
import type { ParsedProblem } from "../../types/ui";

interface TopBarProps {
  problem:        ParsedProblem;
  problems:       ParsedProblem[];
  problemIndex:   number;
  totalProblems:  number;
  onPrev:         () => void;
  onNext:         () => void;
  onSelectProblem: (index: number) => void;
  onRun:          () => void;
  onSubmit:       () => void;
  isRunning:      boolean;
  isSubmitting:   boolean;
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
  const [timerActive, setTimerActive] = useState(false);
  const [seconds,     setSeconds]     = useState(0);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerActive]);

  useEffect(() => {
    if (isDrawerVisible) return;
    if (!isDrawerMounted) return;

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

  function formatTime(t: number): string {
    const h = String(Math.floor(t / 3600)).padStart(2, "0");
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
    const s = String(t % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  const iconBtn: React.CSSProperties = {
    background:  "none",
    border:      "none",
    cursor:      "pointer",
    display:     "flex",
    alignItems:  "center",
    padding:     6,
    borderRadius: 6,
    color:       "#6c7086",
  };

  const isFirst = problemIndex === 0;
  const isLast  = problemIndex === totalProblems - 1;

  return (
    <>
      <header
        style={{
          height:          48,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          padding:         "0 16px",
          backgroundColor: "#1e1e2e",
          borderBottom:    "1px solid #313244",
          flexShrink:      0,
        }}
      >
      {/* ── Left ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Logo */}
        <a
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
        >
          <div
            style={{
              width:           26,
              height:          26,
              backgroundColor: "#ffa116",
              borderRadius:    6,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
            }}
          >
            <span style={{ color: "#1e1e2e", fontWeight: 800, fontSize: 12 }}>LV</span>
          </div>
          <span style={{ color: "#cdd6f4", fontWeight: 600, fontSize: 14 }}>Leetcode Viewer</span>
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

        {/* Problem navigator */}
        <div
          style={{
            display:         "flex",
            alignItems:      "center",
            backgroundColor: "#313244",
            borderRadius:    8,
            padding:         "2px",
            gap:             2,
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
              cursor:  isFirst ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={15} />
          </button>

          <div
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        6,
              padding:    "0 6px",
            }}
          >
            <span
              style={{
                color:      "#a6adc8",
                fontSize:   12,
                fontWeight: 500,
                whiteSpace: "nowrap",
                maxWidth:   160,
                overflow:   "hidden",
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
              cursor:  isLast ? "not-allowed" : "pointer",
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

      {/* ── Center: timer ── */}
      <button
        onClick={() => setTimerActive(!timerActive)}
        title={timerActive ? "Pause timer" : "Start timer"}
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             6,
          padding:         "4px 14px",
          borderRadius:    20,
          border:          timerActive ? "1px solid #89b4fa" : "1px solid #45475a",
          backgroundColor: timerActive ? "rgba(137,180,250,0.1)" : "transparent",
          color:           timerActive ? "#89b4fa" : "#6c7086",
          cursor:          "pointer",
          fontSize:        12,
          fontWeight:      500,
          fontFamily:      "monospace",
        }}
      >
        <Clock size={13} />
        <span>{formatTime(seconds)}</span>
      </button>

      {/* ── Right: run / submit / settings ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onRun}
          disabled={isRunning}
          title="Run code (active test case)"
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             6,
            padding:         "6px 14px",
            borderRadius:    8,
            border:          "none",
            backgroundColor: "#313244",
            color:           "#cdd6f4",
            cursor:          isRunning ? "not-allowed" : "pointer",
            fontSize:        13,
            fontWeight:      500,
            opacity:         isRunning ? 0.5 : 1,
          }}
        >
          <Play size={14} style={{ color: "#a6e3a1" }} />
          {isRunning ? "Running…" : "Run"}
        </button>

        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          title="Submit solution (all test cases)"
          style={{
            display:         "flex",
            alignItems:      "center",
            gap:             6,
            padding:         "6px 14px",
            borderRadius:    8,
            border:          "none",
            backgroundColor: "#a6e3a1",
            color:           "#1e1e2e",
            cursor:          isSubmitting ? "not-allowed" : "pointer",
            fontSize:        13,
            fontWeight:      600,
            opacity:         isSubmitting ? 0.5 : 1,
          }}
        >
          <Upload size={14} />
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>

        <div style={{ width: 1, height: 20, backgroundColor: "#313244", margin: "0 4px" }} />

        <button style={iconBtn} title="Settings">
          <Settings size={17} />
        </button>

        <button
          style={{
            width:           28,
            height:          28,
            borderRadius:    "50%",
            backgroundColor: "#45475a",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            cursor:          "pointer",
            border:          "none",
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
            <div
              style={{
                padding: "14px 14px 10px",
                borderBottom: "1px solid #313244",
              }}
            >
              <div style={{ color: "#cdd6f4", fontSize: 14, fontWeight: 700 }}>
                All Questions
              </div>
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
                <div
                  style={{
                    color: "#6c7086",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "26px 10px",
                  }}
                >
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
