import React, { useState } from "react";
import type { Flags } from "../lib/api.js";

interface FlagListProps {
  flags: Flags;
}

interface FlagSectionProps {
  title: string;
  count: number;
  color: string;
  dot: string;
  items: Array<{ title: string; evidence: string; key?: string }>;
  defaultOpen?: boolean;
}

function FlagSection({ title, count, color, dot, items, defaultOpen = false }: FlagSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div className="border-b border-gray-800">
      <button
        className="w-full flex justify-between items-center px-3 py-2 text-left hover:bg-gray-900 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
          <span style={{ color: dot }}>●</span>
          <span className={color}>{title}</span>
          <span className="text-gray-500">({count})</span>
        </span>
        <span className="text-gray-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="pb-1">
          {items.map((flag, i) => (
            <div key={i} className="flag-item">
              <div className="flag-title" style={{ color }}>
                {flag.title}
              </div>
              <div className="flag-evidence">{flag.evidence}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FlagList({ flags }: FlagListProps) {
  return (
    <div>
      <FlagSection
        title="Red Flags"
        count={flags.red.length}
        color="#ef4444"
        dot="#ef4444"
        items={flags.red}
        defaultOpen={flags.red.length > 0}
      />
      <FlagSection
        title="Amber Flags"
        count={flags.amber.length}
        color="#f59e0b"
        dot="#f59e0b"
        items={flags.amber}
      />
      <FlagSection
        title="Green Flags"
        count={flags.green.length}
        color="#22c55e"
        dot="#22c55e"
        items={flags.green}
      />
    </div>
  );
}
