"use client";

import { Activity, Check, CircleDot, Command, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const lanes = [
  { label: "source signal", value: "skills.sh", color: "blue" },
  { label: "canonical packet", value: "SKILL.md", color: "orange" },
  { label: "target surface", value: "7 harnesses", color: "lime" },
];

export function SignalBoard() {
  const reduced = useReducedMotion();
  return <div className="signal-board" aria-label="Animated skill relay signal board">
    <div className="signal-board-top"><span><CircleDot size={14} /> live topology</span><span>07:26:14 UTC</span></div>
    <div className="signal-visual">
      <div className="signal-orbit orbit-one" />
      <div className="signal-orbit orbit-two" />
      <div className="signal-orbit orbit-three" />
      <div className="signal-core"><Sparkles size={25} /><span>relay</span></div>
      <div className="signal-node node-a"><span>01</span><b>source</b></div>
      <div className="signal-node node-b"><span>02</span><b>packet</b></div>
      <div className="signal-node node-c"><span>03</span><b>target</b></div>
      <div className="signal-sweep" />
    </div>
    <div className="signal-lanes">
      {lanes.map((lane, index) => <motion.div key={lane.label} className={`signal-lane lane-${lane.color}`} animate={reduced ? undefined : { x: [0, 3, 0] }} transition={{ duration: 3.4 + index * 0.7, repeat: Infinity, ease: "easeInOut" }}>
        <span className="lane-dot" /><span>{lane.label}</span><strong>{lane.value}</strong>{index < lanes.length - 1 ? <Check size={13} /> : <Activity size={13} />}
      </motion.div>)}
    </div>
    <div className="signal-board-foot"><Command size={13} /> one capability / many runtimes <span>·</span> no blind installs</div>
  </div>;
}
