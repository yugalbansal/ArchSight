"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DashboardStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  accentColor?: string; // e.g. "#6C63FF"
  className?: string;
}

export function DashboardStatCard({
  icon,
  label,
  value,
  subtext,
  accentColor = "#6C63FF",
  className,
}: DashboardStatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-[#13131E] border border-[#1E1E2E] p-6 overflow-hidden group transition-all duration-300 hover:border-[var(--accent-color)]/40 hover:shadow-[0_0_30px_var(--accent-color,#6C63FF)]/10",
        className
      )}
      style={{ ["--accent-color" as string]: accentColor }}
    >
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: accentColor }}
      />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#5A5A7A] mb-3">
            {label}
          </p>
          <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
          {subtext && (
            <p className="text-xs text-[#5A5A7A] mt-1.5">{subtext}</p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-300"
          style={{
            background: `${accentColor}18`,
            borderColor: `${accentColor}30`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out"
        style={{ background: `linear-gradient(to right, ${accentColor}, transparent)` }}
      />
    </div>
  );
}
