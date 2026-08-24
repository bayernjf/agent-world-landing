export type Accent = "power" | "data" | "plasma" | "ok" | "warn";
export type Mode = "select" | "connect" | "delete";

export interface Plant {
  id: string;
  name: string;
  role: string;
  cx: number;
  cy: number;
  accent: Accent;
  tier: string;
  /** throughput in artifacts/hour at full load, used by the inspector */
  rate: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  kind: Accent;
}

/** Canvas is sized to match the hero map so the two read as the same world. */
export const VIEW_W = 1240;
export const VIEW_H = 580;
export const PLANT_W = 140;
export const PLANT_H = 86;

export const SOURCE_ID = "intake";
export const SINK_ID = "depot";
export const CRITIC_ID = "critic";

/* Columns are spaced >= MIN_FORWARD_GAP apart so every downstream edge routes as a
   forward dogleg; only the CRITIC rework edge is a backward bypass. */
export const INITIAL_PLANTS: Plant[] = [
  { id: "intake", name: "INTAKE", role: "任务分流", cx: 100, cy: 320, accent: "data", tier: "T1", rate: 60 },
  { id: "planner", name: "PLANNER", role: "拆解规划", cx: 310, cy: 165, accent: "plasma", tier: "T3", rate: 34 },
  { id: "research", name: "RESEARCH", role: "资料勘探", cx: 310, cy: 475, accent: "data", tier: "T2", rate: 28 },
  { id: "forge", name: "FORGE", role: "代码锻造", cx: 520, cy: 320, accent: "power", tier: "T4", rate: 41 },
  { id: "critic", name: "CRITIC", role: "质检返工", cx: 730, cy: 165, accent: "ok", tier: "T3", rate: 52 },
  { id: "shipyard", name: "SHIPYARD", role: "构建交付", cx: 940, cy: 430, accent: "power", tier: "T3", rate: 37 },
  { id: "depot", name: "DEPOT", role: "成品仓库", cx: 1150, cy: 300, accent: "ok", tier: "T2", rate: 80 },
];

export const INITIAL_CONNECTIONS: Connection[] = [
  { id: "c1", from: "intake", to: "planner", kind: "data" },
  { id: "c2", from: "intake", to: "research", kind: "data" },
  { id: "c3", from: "planner", to: "forge", kind: "plasma" },
  { id: "c4", from: "research", to: "forge", kind: "data" },
  { id: "c5", from: "forge", to: "critic", kind: "power" },
  { id: "c6", from: "critic", to: "shipyard", kind: "ok" },
  { id: "c7", from: "critic", to: "forge", kind: "warn" },
  { id: "c8", from: "shipyard", to: "depot", kind: "power" },
];

export const ACCENT_VAR: Record<Accent, string> = {
  power: "var(--power)",
  data: "var(--data)",
  plasma: "var(--plasma)",
  ok: "var(--ok)",
  warn: "var(--warn)",
};

/** Token cost charged per pipe traversal, keyed by what flows through it. */
export const SEGMENT_COST: Record<Accent, number> = {
  data: 180,
  plasma: 420,
  power: 640,
  ok: 220,
  warn: 0,
};

export const STARTING_TOKENS = 24000;
