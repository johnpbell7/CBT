"use client";

import Timer from "@/components/Timer";
import Recorder from "@/components/Recorder";
import ParkedList from "@/components/ParkedList";

export default function WorryTime({ active }: { active: boolean }) {
  return (
    <section className={`view${active ? " on" : ""}`} id="v-worry" aria-labelledby="t-worry" role="tabpanel">
      <h1 id="t-worry">Worry time</h1>
      <p className="lede">
        One slot a day to face what&apos;s on your mind. Outside the slot, park it — come back to it here.
      </p>

      <Timer />

      <h2>Say it out loud</h2>
      <Recorder active={active} />

      <h2>Parked worries</h2>
      <ParkedList />

      <p className="foot">A practice aid for CBT skills, not a substitute for treatment or crisis support.</p>
    </section>
  );
}
