import {
  PLANT_H,
  PLANT_W,
  type Connection,
  type Plant,
} from "./data";

interface Pt {
  x: number;
  y: number;
}

const CORNER = 20;
/** Below this horizontal gap a straight run won't fit, so we route a bypass loop. */
const MIN_FORWARD_GAP = 70;

export const plantById = (plants: Plant[], id: string) =>
  plants.find((p) => p.id === id);

/** Pipes leave a plant on its right edge and enter the next one on its left. */
const portOut = (p: Plant): Pt => ({ x: p.cx + PLANT_W / 2, y: p.cy });
const portIn = (p: Plant): Pt => ({ x: p.cx - PLANT_W / 2, y: p.cy });
const portTop = (p: Plant): Pt => ({ x: p.cx, y: p.cy - PLANT_H / 2 });

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/** Move `len` units from `a` towards `b`. */
function towards(a: Pt, b: Pt, len: number): Pt {
  const d = dist(a, b);
  if (d === 0) return { ...a };
  return { x: a.x + ((b.x - a.x) / d) * len, y: a.y + ((b.y - a.y) / d) * len };
}

/**
 * Turn an orthogonal waypoint list into a path with rounded corners.
 * Collinear or near-coincident points degrade harmlessly into straight runs.
 */
function roundedPath(pts: Pt[], r = CORNER): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const rr = Math.min(r, dist(cur, prev) / 2, dist(cur, next) / 2);
    const a = towards(cur, prev, rr);
    const b = towards(cur, next, rr);
    d += ` L${a.x},${a.y} Q${cur.x},${cur.y} ${b.x},${b.y}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last.x},${last.y}`;
}

/**
 * Route a pipe between two plants. Downstream pairs get a horizontal-first
 * manhattan run; pairs with no room ahead (a rework loop feeding an upstream
 * plant) bypass over the top so the two directions never overlap.
 */
export function routePipe(from: Plant, to: Plant): string {
  const s = portOut(from);
  const t = portIn(to);

  if (t.x - s.x >= MIN_FORWARD_GAP) {
    if (Math.abs(t.y - s.y) < 2) return roundedPath([s, t]);
    const midX = (s.x + t.x) / 2;
    return roundedPath([s, { x: midX, y: s.y }, { x: midX, y: t.y }, t]);
  }

  // bypass: out the right, up over both plants, down into the target's roof
  const top = portTop(to);
  const overY =
    Math.min(from.cy, to.cy) - PLANT_H / 2 - 58;
  const outX = s.x + 34;
  return roundedPath([
    s,
    { x: outX, y: s.y },
    { x: outX, y: overY },
    { x: top.x, y: overY },
    top,
  ]);
}

export function connectionPath(
  plants: Plant[],
  c: Connection
): string | null {
  const from = plantById(plants, c.from);
  const to = plantById(plants, c.to);
  if (!from || !to) return null;
  return routePipe(from, to);
}

/** True when the pipe runs backwards, i.e. it is a rework loop. */
export function isLoop(plants: Plant[], c: Connection): boolean {
  const from = plantById(plants, c.from);
  const to = plantById(plants, c.to);
  if (!from || !to) return false;
  return to.cx - PLANT_W / 2 - (from.cx + PLANT_W / 2) < MIN_FORWARD_GAP;
}

/** Shortest hop path between two plants, or null when the line is broken. */
export function findRoute(
  connections: Connection[],
  fromId: string,
  toId: string
): string[] | null {
  if (fromId === toId) return [fromId];
  const adjacency = new Map<string, string[]>();
  for (const c of connections) {
    const list = adjacency.get(c.from);
    if (list) list.push(c.to);
    else adjacency.set(c.from, [c.to]);
  }

  const queue: string[][] = [[fromId]];
  const seen = new Set([fromId]);
  while (queue.length) {
    const path = queue.shift()!;
    const tail = path[path.length - 1];
    for (const next of adjacency.get(tail) ?? []) {
      if (next === toId) return [...path, next];
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
}

export const findConnection = (
  connections: Connection[],
  from: string,
  to: string
) => connections.find((c) => c.from === from && c.to === to);

/**
 * Synthetic load figure for the inspector. More wiring means a busier plant,
 * so the number reacts to whatever topology the visitor builds.
 */
export function loadOf(connections: Connection[], plantId: string): number {
  const incoming = connections.filter((c) => c.to === plantId).length;
  const outgoing = connections.filter((c) => c.from === plantId).length;
  if (incoming + outgoing === 0) return 0;
  return Math.min(99, 34 + incoming * 21 + outgoing * 9);
}
