"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type ComboboxProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean; // allow typing a value not in the list
  className?: string;
};

/**
 * Type-ahead combobox. Shows a filtered dropdown as the user types instead of
 * dumping every option at once. If allowCustom, whatever is typed becomes the
 * value even if it's not in the list.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  allowCustom = true,
  className = "",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        // commit free text on blur if custom allowed
        if (allowCustom && query !== value) onChange(query);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [query, value, allowCustom, onChange]);

  const filtered =
    query.trim() === ""
      ? options.slice(0, 50)
      : options
          .filter((o) => o.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 50);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          className="sabi-input pr-9"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (allowCustom) onChange(e.target.value);
          }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown
          className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl shadow-xl"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--border)",
          }}
        >
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setQuery(o);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[var(--bg-deep)] transition"
            >
              <span>{o}</span>
              {value === o && <Check className="w-4 h-4 text-jollof" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
