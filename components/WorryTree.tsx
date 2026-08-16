"use client";

import { useCallback, useState } from "react";
import { useStore } from "@/components/Store";
import ScrunchBin from "@/components/ScrunchBin";
import { buzz, TAP } from "@/lib/haptics";

type Stage = "name" | "actionable" | "now" | "let-go" | "do-now" | "plan" | "done";

/** The step bar tracks the two questions plus the outcome. */
const STEP_OF: Record<Stage, number> = {
  name: 0,
  actionable: 1,
  now: 1,
  "let-go": 2,
  "do-now": 2,
  plan: 2,
  done: 2,
};

export default function WorryTree({ active }: { active: boolean }) {
  const { addTree } = useStore();

  const [stage, setStage] = useState<Stage>("name");
  const [text, setText] = useState("");
  const [plan, setPlan] = useState("");
  const [planWhen, setPlanWhen] = useState("");
  const [landed, setLanded] = useState(false);

  const reset = useCallback(() => {
    buzz(TAP);
    setStage("name");
    setText("");
    setPlan("");
    setPlanWhen("");
    setLanded(false);
  }, []);

  const go = (next: Stage) => {
    buzz(TAP);
    setStage(next);
  };

  const step = STEP_OF[stage];

  return (
    <section className={`view${active ? " on" : ""}`} id="v-tree" aria-labelledby="t-tree" role="tabpanel">
      <h1 id="t-tree">Worry tree</h1>
      <p className="lede">
        Two questions decide what a worry deserves: an action, a plan, or your attention elsewhere.
      </p>
      <div className="steps" aria-hidden="true">
        <i className={step >= 0 ? "on" : ""}></i>
        <i className={step >= 1 ? "on" : ""}></i>
        <i className={step >= 2 ? "on" : ""}></i>
      </div>

      <div>
        {stage === "name" && (
          <div className="card">
            <h2 className="q" style={{ marginBottom: 9 }}>What&apos;s the worry?</h2>
            <textarea
              placeholder="Put it in your own words"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="btn"
              style={{ marginTop: 14 }}
              disabled={!text.trim()}
              onClick={() => go("actionable")}
            >
              Next
            </button>
          </div>
        )}

        {stage === "actionable" && (
          <>
            <div className="card pale">
              <p style={{ margin: 0 }}>{text}</p>
            </div>
            <div className="card">
              <h2 className="q" style={{ marginBottom: 12 }}>Can you do something about it?</h2>
              <div className="btn-row">
                <button className="btn" onClick={() => go("now")}>
                  Yes
                </button>
                <button className="btn quiet" onClick={() => go("let-go")}>
                  No
                </button>
              </div>
              <p className="tiny" style={{ margin: "12px 2px 0" }}>
                Anything you genuinely can&apos;t influence is a hypothetical worry.
              </p>
            </div>
            <button className="back" onClick={() => go("name")}>
              ‹ Back
            </button>
          </>
        )}

        {stage === "now" && (
          <>
            <div className="card pale">
              <p style={{ margin: 0 }}>{text}</p>
            </div>
            <div className="card">
              <h2 className="q" style={{ marginBottom: 12 }}>Can you do it now?</h2>
              <div className="btn-row">
                <button className="btn" onClick={() => go("do-now")}>
                  Yes
                </button>
                <button className="btn quiet" onClick={() => go("plan")}>
                  Not yet
                </button>
              </div>
            </div>
            <button className="back" onClick={() => go("actionable")}>
              ‹ Back
            </button>
          </>
        )}

        {stage === "let-go" && (
          <div className="card">
            <h2 className="q">A hypothetical worry</h2>
            <p className="muted" style={{ margin: "0 0 4px" }}>
              There&apos;s no action in this one. Screw it up and put it where it belongs — then change what
              you&apos;re doing.
            </p>
            <ScrunchBin
              text={text}
              onLanded={() => {
                setLanded(true);
                void addTree({ text, kind: "let-go", plan: "", planWhen: "" });
              }}
            />
            {landed && (
              <div className="rise">
                <p className="muted" style={{ margin: "12px 0 14px" }}>
                  Gone. If it comes back, that&apos;s normal — park it and give your attention to something
                  absorbing instead.
                </p>
                <button className="btn quiet" onClick={reset}>
                  Another worry
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "do-now" && (
          <>
            <div className="card">
              <h2 className="q">Do it now</h2>
              <p className="muted" style={{ margin: "0 0 14px" }}>
                Take the smallest first step while you&apos;re here. Action is what shrinks a practical worry.
              </p>
              <div className="card pale" style={{ marginBottom: 14 }}>
                <p style={{ margin: 0 }}>{text}</p>
              </div>
              <input
                type="text"
                placeholder="The first step"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              />
              <button
                className="btn"
                style={{ marginTop: 12 }}
                onClick={() => {
                  void addTree({ text, kind: "do-now", plan: plan.trim(), planWhen: "Now" });
                  go("done");
                }}
              >
                Save and get on with it
              </button>
            </div>
            <button className="back" onClick={() => go("now")}>
              ‹ Back
            </button>
          </>
        )}

        {stage === "plan" && (
          <>
            <div className="card">
              <h2 className="q">Make a plan</h2>
              <p className="muted" style={{ margin: "0 0 14px" }}>
                Decide what you&apos;ll do and when. Then the worry has somewhere to be that isn&apos;t your head.
              </p>
              <div className="stack">
                <input
                  type="text"
                  placeholder="What you'll do"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="When — a day and a time"
                  value={planWhen}
                  onChange={(e) => setPlanWhen(e.target.value)}
                />
              </div>
              <button
                className="btn"
                style={{ marginTop: 14 }}
                disabled={!plan.trim()}
                onClick={() => {
                  void addTree({ text, kind: "plan", plan: plan.trim(), planWhen: planWhen.trim() });
                  go("done");
                }}
              >
                Save the plan
              </button>
            </div>
            <button className="back" onClick={() => go("now")}>
              ‹ Back
            </button>
          </>
        )}

        {stage === "done" && (
          <div className="card rise">
            <h2 className="q">Saved</h2>
            <p className="muted" style={{ margin: "0 0 14px" }}>
              It&apos;s in Saved with the rest. Come back to it in your worry time, not before.
            </p>
            <button className="btn quiet" onClick={reset}>
              Another worry
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
