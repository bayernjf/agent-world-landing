import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCENT_VAR,
  CRITIC_ID,
  INITIAL_CONNECTIONS,
  INITIAL_PLANTS,
  PLANT_H,
  PLANT_W,
  SEGMENT_COST,
  SINK_ID,
  SOURCE_ID,
  STARTING_TOKENS,
  VIEW_H,
  VIEW_W,
  type Connection,
  type Mode,
  type Plant,
} from "./data";
import {
  connectionPath,
  findConnection,
  findRoute,
  loadOf,
  plantById,
} from "./routing";

/** Pixels-per-second the work packet travels along a pipe. */
const PACKET_SPEED = 300;
const REWORK_CHANCE = 0.35;
/** Drag threshold in viewBox units below which a pointer gesture counts as a click. */
const CLICK_SLOP = 5;

type Phase = "travel" | "process";

interface TaskRun {
  hops: string[];
  /** index of the station the packet last reached */
  idx: number;
  phase: Phase;
  /** progress 0..1 along the pipe from hops[idx] to hops[idx+1] */
  t: number;
  dwellUntil: number;
  reworked: boolean;
}

interface Status {
  tone: "idle" | "run" | "warn" | "error" | "done";
  text: string;
}

const MODE_LABEL: Record<Mode, string> = {
  select: "选择 / 拖拽",
  connect: "连线",
  delete: "拆除",
};

const MODE_HINT: Record<Mode, string> = {
  select: "拖动厂房重新布局，单击查看厂房详情",
  connect: "依次点击两座厂房，铺设一条管道",
  delete: "点击厂房或管道，将其拆除",
};

export default function SandboxCanvas() {
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PLANTS);
  const [connections, setConnections] = useState<Connection[]>(INITIAL_CONNECTIONS);
  const [mode, setMode] = useState<Mode>("select");
  const [selectedId, setSelectedId] = useState<string | null>("forge");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [tokens, setTokens] = useState(STARTING_TOKENS);
  const [running, setRunning] = useState(false);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({
    tone: "idle",
    text: "产线就绪 · 等待投料",
  });
  /** Drag and connect need a real pointer; below the map breakpoint we only inspect. */
  const [canEdit, setCanEdit] = useState(true);

  const svgRef = useRef<SVGSVGElement>(null);
  const packetRef = useRef<SVGGElement>(null);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  const dragRef = useRef<{
    id: string;
    dx: number;
    dy: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const taskRef = useRef<TaskRun | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1001px)");
    const sync = () => setCanEdit(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const paths = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of connections) {
      const d = connectionPath(plants, c);
      if (d) out[c.id] = d;
    }
    return out;
  }, [plants, connections]);

  const selected = selectedId ? plantById(plants, selectedId) : undefined;

  const toView = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * VIEW_W,
      y: ((clientY - r.top) / r.height) * VIEW_H,
    };
  }, []);

  // ---------- task simulation ----------

  const stopTask = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    taskRef.current = null;
    setRunning(false);
    setActiveStation(null);
  }, []);

  const tick = useCallback(
    (ts: number) => {
      const run = taskRef.current;
      if (!run) return;
      const dt = Math.min(64, ts - lastTsRef.current);
      lastTsRef.current = ts;

      if (run.phase === "process") {
        if (ts >= run.dwellUntil) {
          run.phase = "travel";
          run.t = 0;
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const fromId = run.hops[run.idx];
      const toId = run.hops[run.idx + 1];
      const conn = toId ? findConnection(connections, fromId, toId) : undefined;
      const el = conn ? pathRefs.current[conn.id] : null;
      if (!conn || !el) {
        setStatus({ tone: "error", text: "管道中断 · 工件滞留" });
        stopTask();
        return;
      }

      const total = el.getTotalLength();
      run.t = Math.min(1, run.t + ((dt / 1000) * PACKET_SPEED) / (total || 1));
      const p = el.getPointAtLength(run.t * total);
      packetRef.current?.setAttribute("transform", `translate(${p.x},${p.y})`);

      if (run.t >= 1) {
        run.idx += 1;
        setTokens((v) => Math.max(0, v - SEGMENT_COST[conn.kind]));
        const arrived = run.hops[run.idx];
        setActiveStation(arrived);

        if (run.idx >= run.hops.length - 1) {
          setStatus({ tone: "done", text: "工件出库 · SHIPPED" });
          taskRef.current = null;
          rafRef.current = null;
          setRunning(false);
          return;
        }

        // CRITIC may bounce the artifact back upstream, once per run
        if (arrived === CRITIC_ID && !run.reworked) {
          const loop = connections.find(
            (c) => c.from === CRITIC_ID && run.hops.slice(0, run.idx).includes(c.to)
          );
          if (loop && Math.random() < REWORK_CHANCE) {
            run.hops.splice(run.idx + 1, 0, loop.to, CRITIC_ID);
            run.reworked = true;
            setStatus({ tone: "warn", text: "质检未通过 · 返工回流" });
          }
        }

        run.phase = "process";
        run.dwellUntil = ts + 700 + Math.random() * 600;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [connections, stopTask]
  );

  const dispatchTask = useCallback(() => {
    if (running) return;
    const hops = findRoute(connections, SOURCE_ID, SINK_ID);
    if (!hops) {
      setStatus({ tone: "error", text: "产线断开 · NO ROUTE TO DEPOT" });
      return;
    }
    const start = plantById(plants, hops[0]);
    if (start) {
      packetRef.current?.setAttribute(
        "transform",
        `translate(${start.cx + PLANT_W / 2},${start.cy})`
      );
    }
    taskRef.current = {
      hops,
      idx: 0,
      phase: "process",
      t: 0,
      dwellUntil: performance.now() + 420,
      reworked: false,
    };
    setRunning(true);
    setActiveStation(hops[0]);
    setStatus({ tone: "run", text: "工件已投料 · IN TRANSIT" });
    lastTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [connections, plants, running, tick]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // ---------- editing ----------

  const reset = () => {
    stopTask();
    setPlants(INITIAL_PLANTS);
    setConnections(INITIAL_CONNECTIONS);
    setMode("select");
    setSelectedId("forge");
    setConnectFrom(null);
    setTokens(STARTING_TOKENS);
    setStatus({ tone: "idle", text: "产线已复原 · 等待投料" });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setConnectFrom(null);
    setCursor(null);
  };

  const removePlant = (id: string) => {
    stopTask();
    setPlants((prev) => prev.filter((p) => p.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    if (selectedId === id) setSelectedId(null);
    setStatus({ tone: "warn", text: `已拆除厂房 · ${id.toUpperCase()}` });
  };

  const removeConnection = (id: string) => {
    stopTask();
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setStatus({ tone: "warn", text: "已拆除一段管道" });
  };

  const linkPlants = (fromId: string, toId: string) => {
    if (fromId === toId) {
      setConnectFrom(null);
      return;
    }
    if (findConnection(connections, fromId, toId)) {
      setStatus({ tone: "warn", text: "这条管道已经存在" });
      setConnectFrom(null);
      return;
    }
    const target = plantById(plants, toId);
    setConnections((prev) => [
      ...prev,
      {
        id: `u${Date.now()}`,
        from: fromId,
        to: toId,
        kind: target?.accent ?? "data",
      },
    ]);
    setConnectFrom(null);
    setCursor(null);
    setStatus({
      tone: "done",
      text: `已铺设管道 · ${fromId.toUpperCase()} → ${toId.toUpperCase()}`,
    });
  };

  const onPlantPointerDown = (e: React.PointerEvent, p: Plant) => {
    if (mode !== "select" || !canEdit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = toView(e.clientX, e.clientY);
    dragRef.current = {
      id: p.id,
      dx: v.x - p.cx,
      dy: v.y - p.cy,
      ox: v.x,
      oy: v.y,
      moved: false,
    };
  };

  const onPlantPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const v = toView(e.clientX, e.clientY);
    if (!drag.moved && Math.hypot(v.x - drag.ox, v.y - drag.oy) < CLICK_SLOP) return;
    drag.moved = true;
    const nx = v.x - drag.dx;
    const ny = v.y - drag.dy;
    setPlants((prev) =>
      prev.map((p) =>
        p.id === drag.id
          ? {
              ...p,
              cx: Math.max(PLANT_W / 2 + 4, Math.min(VIEW_W - PLANT_W / 2 - 4, nx)),
              cy: Math.max(PLANT_H / 2 + 26, Math.min(VIEW_H - PLANT_H / 2 - 20, ny)),
            }
          : p
      )
    );
  };

  const onPlantPointerUp = (p: Plant) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) return; // a drag, not a click
    handlePlantClick(p);
  };

  const handlePlantClick = (p: Plant) => {
    if (mode === "delete") {
      if (canEdit) removePlant(p.id);
      return;
    }
    if (mode === "connect") {
      if (!canEdit) return;
      if (connectFrom === null) {
        setConnectFrom(p.id);
        setStatus({ tone: "run", text: `起点 ${p.name} · 请点击目标厂房` });
      } else {
        linkPlants(connectFrom, p.id);
      }
      return;
    }
    setSelectedId(p.id);
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (mode === "connect" && connectFrom) setCursor(toView(e.clientX, e.clientY));
  };

  const connectAnchor = connectFrom ? plantById(plants, connectFrom) : undefined;

  return (
    <div className="sb">
      <div className="sb__toolbar">
        <div className="sb__tools">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`sb__tool${mode === m ? " is-on" : ""}`}
              onClick={() => switchMode(m)}
              disabled={!canEdit && m !== "select"}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
          <button type="button" className="sb__tool" onClick={reset}>
            重置
          </button>
        </div>

        <div className="sb__right">
          <div className="sb__tokens">
            <span className="sb__tokens-label">TOKEN 储备</span>
            <span className="sb__tokens-val readout">{tokens.toLocaleString("en-US")}</span>
            <div className="gauge sb__tokens-gauge">
              <i style={{ width: `${(tokens / STARTING_TOKENS) * 100}%` }} />
            </div>
          </div>
          <button
            type="button"
            className="btn sb__dispatch"
            onClick={dispatchTask}
            disabled={running}
          >
            {running ? "生产中…" : "派发任务"}
          </button>
        </div>
      </div>

      <div className="sb__statusbar">
        <span className={`sb__status sb__status--${status.tone}`}>
          <span className="led" data-c={status.tone === "error" ? "alert" : "data"} />
          {status.text}
        </span>
        <span className="sb__hint">
          {canEdit
            ? MODE_HINT[mode]
            : "拖拽建线请在桌面端体验 · 此处可左右拖动查看、点选厂房并派发任务"}
        </span>
      </div>

      <div className="sb__canvas">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className={`sb__svg sb__svg--${mode}`}
          onPointerMove={onSvgPointerMove}
        >
          <defs>
            <linearGradient id="sb-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2b3841" />
              <stop offset="45%" stopColor="#1b242b" />
              <stop offset="100%" stopColor="#121a1f" />
            </linearGradient>
            <pattern id="sb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 H0 V40" fill="none" stroke="rgba(120,160,180,.08)" strokeWidth="1" />
            </pattern>
            <pattern id="sb-grid-lg" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M200 0 H0 V200" fill="none" stroke="rgba(120,160,180,.13)" strokeWidth="1" />
            </pattern>
            <radialGradient id="sb-fade" cx="50%" cy="50%" r="64%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id="sb-fade-mask">
              <rect width={VIEW_W} height={VIEW_H} fill="url(#sb-fade)" />
            </mask>
            <filter id="sb-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="sb-soft" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          <g mask="url(#sb-fade-mask)">
            <rect width={VIEW_W} height={VIEW_H} fill="url(#sb-grid)" />
            <rect width={VIEW_W} height={VIEW_H} fill="url(#sb-grid-lg)" />
          </g>

          {/* ---------- pipes ---------- */}
          <g>
            {connections.map((c) => {
              const d = paths[c.id];
              if (!d) return null;
              const color = ACCENT_VAR[c.kind];
              return (
                <g key={c.id}>
                  <path d={d} fill="none" stroke="#0c1216" strokeWidth="9" strokeLinecap="round" />
                  <path
                    ref={(el) => {
                      pathRefs.current[c.id] = el;
                    }}
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeOpacity={c.kind === "warn" ? 0.42 : 0.3}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={c.kind === "warn" ? "7 8" : undefined}
                  />
                  {c.kind !== "warn" &&
                    [0, 1, 2].map((i) => (
                      <circle
                        key={i}
                        r="3.1"
                        cx="0"
                        cy="0"
                        fill={color}
                        filter="url(#sb-glow)"
                        className="sb__flow"
                        style={{
                          offsetPath: `path("${d}")`,
                          animationDelay: `${-i * 1.05}s`,
                        }}
                      />
                    ))}
                  {mode === "delete" && canEdit && (
                    <path
                      d={d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="20"
                      className="sb__pipe-hit"
                      onClick={() => removeConnection(c.id)}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* pending connection rubber band */}
          {connectAnchor && cursor && (
            <line
              x1={connectAnchor.cx + PLANT_W / 2}
              y1={connectAnchor.cy}
              x2={cursor.x}
              y2={cursor.y}
              stroke="var(--power)"
              strokeWidth="2"
              strokeDasharray="8 7"
              opacity="0.75"
            />
          )}

          {/* ---------- plants ---------- */}
          {plants.map((p) => {
            const x = p.cx - PLANT_W / 2;
            const y = p.cy - PLANT_H / 2;
            const color = ACCENT_VAR[p.accent];
            const load = loadOf(connections, p.id);
            const isSel = selectedId === p.id && mode === "select";
            const isActive = activeStation === p.id;
            const isAnchor = connectFrom === p.id;
            return (
              <g
                key={p.id}
                className={`sb__plant${isActive ? " is-active" : ""}`}
                onPointerDown={(e) => onPlantPointerDown(e, p)}
                onPointerMove={onPlantPointerMove}
                onPointerUp={() => onPlantPointerUp(p)}
              >
                <ellipse
                  cx={p.cx}
                  cy={y + PLANT_H + 8}
                  rx={PLANT_W / 1.7}
                  ry="10"
                  fill={color}
                  fillOpacity={isActive ? 0.3 : 0.13}
                  filter="url(#sb-soft)"
                />
                <rect x={x + 16} y={y - 13} width="13" height="14" fill="#202b32" stroke="#33434d" />
                <rect x={x + 34} y={y - 8} width="9" height="9" fill="#1a232a" stroke="#33434d" />
                {isActive &&
                  [0, 1, 2].map((i) => (
                    <circle
                      key={i}
                      cx={x + 22.5}
                      cy={y - 16}
                      r="4"
                      fill={color}
                      fillOpacity="0.24"
                      className="sb__smoke"
                      style={{ animationDelay: `${i * 1.1}s` }}
                    />
                  ))}

                <rect x={x} y={y} width={PLANT_W} height={PLANT_H} rx="3" fill="url(#sb-metal)" stroke={isSel ? color : "#3a4a55"} />
                <rect x={x} y={y} width={PLANT_W} height="4" fill={color} filter="url(#sb-glow)" />
                {[
                  [x + 6, y + 12],
                  [x + PLANT_W - 6, y + 12],
                  [x + 6, y + PLANT_H - 6],
                  [x + PLANT_W - 6, y + PLANT_H - 6],
                ].map(([rx, ry], i) => (
                  <circle key={i} cx={rx} cy={ry} r="1.7" fill="#5e7180" />
                ))}

                <rect x={x + 10} y={y + 12} width="26" height="13" rx="1" fill="#0c1317" stroke={color} strokeOpacity="0.5" />
                <text x={x + 23} y={y + 22} className="sb-t-tier" fill={color} textAnchor="middle">
                  {p.tier}
                </text>
                <circle cx={x + PLANT_W - 14} cy={y + 18} r="3.2" fill={color} filter="url(#sb-glow)" className="sb__led" />
                <text x={x + 42} y={y + 23} className="sb-t-name">
                  {p.name}
                </text>
                <text x={x + 10} y={y + 44} className="sb-t-role">
                  {p.role}
                </text>
                <rect x={x + 10} y={y + 56} width={PLANT_W - 20} height="6" fill="#0a1014" stroke="#2c3a44" />
                <rect x={x + 11} y={y + 57} width={((PLANT_W - 22) * load) / 100} height="4" fill={color} fillOpacity="0.85" />
                <text x={x + 10} y={y + 77} className="sb-t-meta">
                  {isActive ? "PROCESSING" : "LOAD"}
                </text>
                <text x={x + PLANT_W - 10} y={y + 77} className="sb-t-meta" textAnchor="end">
                  {load}%
                </text>

                {(isSel || isAnchor) && <SelectionBrackets x={x} y={y} color={isAnchor ? "var(--power)" : color} />}
              </g>
            );
          })}

          {/* ---------- work packet ---------- */}
          <g ref={packetRef} className="sb__packet" style={{ opacity: running ? 1 : 0 }}>
            <circle r="9" fill="var(--power)" fillOpacity="0.18" filter="url(#sb-soft)" />
            <rect x="-5" y="-5" width="10" height="10" fill="var(--power)" filter="url(#sb-glow)" />
          </g>
        </svg>

        {selected && mode === "select" && (
          <div className="sb__inspector panel panel--riveted">
            <div className="panel__bar">
              <span>厂房检视 · UNIT INSPECTOR</span>
              <span className="led" data-c="power" />
            </div>
            <div className="sb__inspector-body">
              <div className="sb__insp-title" style={{ color: ACCENT_VAR[selected.accent] }}>
                {selected.name}
                <span className="sb__insp-role">{selected.role}</span>
              </div>
              <dl className="sb__insp-grid">
                <div>
                  <dt>负载</dt>
                  <dd>{loadOf(connections, selected.id)}%</dd>
                </div>
                <div>
                  <dt>吞吐</dt>
                  <dd>{selected.rate} art/h</dd>
                </div>
                <div>
                  <dt>入线</dt>
                  <dd>{connections.filter((c) => c.to === selected.id).length}</dd>
                </div>
                <div>
                  <dt>出线</dt>
                  <dd>{connections.filter((c) => c.from === selected.id).length}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectionBrackets({ x, y, color }: { x: number; y: number; color: string }) {
  const ox = x - 9;
  const oy = y - 9;
  const w = PLANT_W + 18;
  const h = PLANT_H + 18;
  const L = 15;
  return (
    <g className="sb__sel" filter="url(#sb-glow)" pointerEvents="none">
      <path d={`M${ox},${oy + L} V${oy} H${ox + L}`} fill="none" stroke={color} strokeWidth="2" />
      <path d={`M${ox + w - L},${oy} H${ox + w} V${oy + L}`} fill="none" stroke={color} strokeWidth="2" />
      <path d={`M${ox + w},${oy + h - L} V${oy + h} H${ox + w - L}`} fill="none" stroke={color} strokeWidth="2" />
      <path d={`M${ox + L},${oy + h} H${ox} V${oy + h - L}`} fill="none" stroke={color} strokeWidth="2" />
    </g>
  );
}
