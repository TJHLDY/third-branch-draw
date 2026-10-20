import { poolIds } from "@/lib/bank";

export type PoolKey = keyof typeof poolIds;

export type Pools = Record<PoolKey, string[]>;

export type DrawnCard = {
  id: string;
  kind: "hot" | "hard" | "twenty" | "other" | "ask";
  label: string;
};

export type PersonRound = {
  n: number;
  cards: DrawnCard[];
  note: string | null;
};

export type SessionState = {
  hotId: string | null;
  people: PersonRound[];
  pools: Pools;
};

export function freshPools(): Pools {
  return {
    hot: [...poolIds.hot],
    hard: [...poolIds.hard],
    twenty: [...poolIds.twenty],
    other: [...poolIds.other],
    ask: [...poolIds.ask],
  };
}

export function freshSession(): SessionState {
  return { hotId: null, people: [], pools: freshPools() };
}

function take(pool: string[], source: readonly string[], reserved: string[]): { id: string; pool: string[]; recycled: boolean } {
  let next = pool.filter((id) => !reserved.includes(id));
  let recycled = false;
  if (next.length === 0) {
    next = source.filter((id) => !reserved.includes(id));
    recycled = true;
  }
  if (next.length === 0) {
    next = [...source];
    recycled = true;
  }
  const index = Math.floor(Math.random() * next.length);
  const id = next[index]!;
  return { id, pool: next.filter((item) => item !== id), recycled };
}

export function drawHot(state: SessionState): SessionState {
  const picked = take(state.pools.hot, poolIds.hot, state.hotId ? [state.hotId] : []);
  return {
    ...state,
    hotId: picked.id,
    pools: { ...state.pools, hot: picked.pool },
  };
}

const kindLabel: Record<DrawnCard["kind"], string> = {
  hot: "时事热点",
  hard: "党章 · 难",
  twenty: "党章 · 二十大",
  other: "党章 · 其他",
  ask: "单独提问",
};

export function drawPerson(state: SessionState): SessionState {
  const pools: Pools = {
    hot: [...state.pools.hot],
    hard: [...state.pools.hard],
    twenty: [...state.pools.twenty],
    other: [...state.pools.other],
    ask: [...state.pools.ask],
  };
  const notes: string[] = [];

  const useHard = Math.random() < 0.5;
  const specialKey: PoolKey = useHard ? "hard" : "twenty";
  const specialKind: DrawnCard["kind"] = useHard ? "hard" : "twenty";
  const special = take(pools[specialKey], poolIds[specialKey], []);
  pools[specialKey] = special.pool;
  if (special.recycled) notes.push(useHard ? "难题已抽完，开始新一轮" : "二十大题目已抽完，开始新一轮");

  const others: DrawnCard[] = [];
  const takenOther: string[] = [];
  for (let i = 0; i < 2; i += 1) {
    const picked = take(pools.other, poolIds.other, takenOther);
    pools.other = picked.pool;
    takenOther.push(picked.id);
    if (picked.recycled && !notes.some((note) => note.startsWith("其他题"))) {
      notes.push("其他题已抽完，开始新一轮");
    }
    others.push({ id: picked.id, kind: "other", label: kindLabel.other });
  }

  const asks: DrawnCard[] = [];
  const takenAsk: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const picked = take(pools.ask, poolIds.ask, takenAsk);
    pools.ask = picked.pool;
    takenAsk.push(picked.id);
    if (picked.recycled && !notes.some((note) => note.startsWith("单独提问"))) {
      notes.push("单独提问已抽完，开始新一轮");
    }
    asks.push({ id: picked.id, kind: "ask", label: kindLabel.ask });
  }

  const cards: DrawnCard[] = [
    { id: special.id, kind: specialKind, label: kindLabel[specialKind] },
    ...others,
    ...asks,
  ];

  return {
    ...state,
    pools,
    people: [
      ...state.people,
      {
        n: state.people.length + 1,
        cards,
        note: notes.length ? notes.join("；") : null,
      },
    ],
  };
}
