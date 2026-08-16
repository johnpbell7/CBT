"use client";

import { useState } from "react";
import { useStore } from "@/components/Store";
import { buzz, TAP } from "@/lib/haptics";

export default function ParkedList() {
  const { parked, addParked, toggleParked, drop } = useStore();
  const [text, setText] = useState("");

  const add = () => {
    const value = text.trim();
    if (!value) return;
    buzz(TAP);
    void addParked(value);
    setText("");
  };

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          placeholder="What's nagging at you?"
          enterKeyHint="done"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button className="btn sm" style={{ flex: "none" }} onClick={add}>
          Park
        </button>
      </div>

      <div>
        {parked.length === 0 ? (
          <div className="empty">
            <strong>Nothing parked</strong>
            A worry written down is a worry you can put off until the slot.
          </div>
        ) : (
          parked.map((row) => (
            <div className="row" key={row.ts}>
              <button
                className="check"
                data-done={row.done}
                aria-label={row.done ? "Mark as still open" : "Mark as dealt with"}
                onClick={() => {
                  buzz(TAP);
                  void toggleParked(row);
                }}
              >
                {row.done && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                )}
              </button>
              <div className={`grow${row.done ? " done-txt" : ""}`}>{row.text}</div>
              <button className="del" aria-label="Delete" onClick={() => void drop("parked", row.ts)}>
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
