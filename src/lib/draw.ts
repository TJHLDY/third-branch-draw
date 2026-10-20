import { poolIds } from "@/lib/bank";

export type PoolKey = keyof typeof poolIds;

export type Pools = Record<PoolKey, string[]>;

export type DrawnCard = {
  id: string;
  kind: "hot" | "hard" | "twenty" | "ask";
  label: string;
  clicked?: boolean;
};

export type Examinee = {
  id: string;
  name: string;
  grade: string;
  major: string;
};

export const roster: Examinee[] = [
  { id: "li-jiayin", name: "李嘉茵", grade: "23级", major: "软工" },
  { id: "xie-duanduan", name: "谢端端", grade: "23级", major: "软工" },
  { id: "he-guihong", name: "何桂虹", grade: "23级", major: "电商" },
  { id: "lai-wenjun", name: "赖文俊", grade: "24级", major: "软工" },
  { id: "lin-runjia", name: "林润佳", grade: "24级", major: "软工" },
  { id: "dong-jiali", name: "董家利", grade: "24级", major: "软工" },
  { id: "wu-yuling", name: "吴毓铃", grade: "24级", major: "软工" },
  { id: "xiong-junxuan", name: "熊俊炫", grade: "24级", major: "软工" },
  { id: "zhang-rubing", name: "张茹冰", grade: "24级", major: "软工" },
  { id: "zhu-haojie", name: "朱浩杰", grade: "24级", major: "软工" },
  { id: "chen-yanfeng", name: "陈颜锋", grade: "24级", major: "电商" },
  { id: "zhu-haojuan", name: "朱浩娟", grade: "24级", major: "电商" },
  { id: "he-anyu", name: "何岸瑜", grade: "24级", major: "电商" },
  { id: "chen-jingwen", name: "陈静雯", grade: "24级", major: "电商" },
  { id: "mai-jiaqi", name: "麦家琪", grade: "24级", major: "电商" },
  { id: "xie-yiqiu", name: "谢怡秋", grade: "24级", major: "电商" },
  { id: "huang-wanyu", name: "黄婉瑜", grade: "24级", major: "电商" },
];

export const members: Examinee[] = [
  { id: "li-wenying", name: "李文莹", grade: "23级", major: "软工" },
  { id: "han-leqi", name: "韩乐琪", grade: "23级", major: "软工" },
  { id: "chen-jiajia", name: "陈佳佳", grade: "23级", major: "软工" },
  { id: "tan-yongxin", name: "谭泳欣", grade: "23级", major: "电商" },
  { id: "lin-jieyao", name: "林洁瑶", grade: "23级", major: "电商" },
  { id: "li-wenxin", name: "李文欣", grade: "24级", major: "软工" },
  { id: "tan-zhuoqian", name: "谭卓谦", grade: "24级", major: "软工" },
  { id: "he-wenjing", name: "何雯静", grade: "24级", major: "电商" },
  { id: "yao-jiateng", name: "姚佳婷", grade: "", major: "" },
];

const memberById: Record<string, Examinee> = Object.fromEntries(members.map((person) => [person.id, person]));

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = next[i]!;
    next[i] = next[j]!;
    next[j] = swap;
  }
  return next;
}

function planMemberPairs(): Examinee[][] {
  const limited = new Set(["li-wenxin", "tan-zhuoqian"]);
  const counts = new Map(members.map((person) => [person.id, limited.has(person.id) ? 3 : 4]));
  const pairs: Examinee[][] = [];
  for (let n = 0; n < roster.length; n += 1) {
    const ranked = shuffle([...counts.entries()].filter(([, left]) => left > 0)).sort((a, b) => b[1] - a[1]);
    const first = ranked[0]?.[0];
    const second = ranked.find(([id]) => id !== first)?.[0];
    if (!first || !second) break;
    counts.set(first, (counts.get(first) ?? 0) - 1);
    counts.set(second, (counts.get(second) ?? 0) - 1);
    pairs.push(shuffle([memberById[first]!, memberById[second]!]));
  }
  return shuffle(pairs);
}

const rosterById: Record<string, Examinee> = Object.fromEntries(roster.map((person) => [person.id, person]));

export function personTitle(who: Examinee) {
  return `${who.name}（${who.grade}${who.major}）`;
}

export type PersonRound = {
  n: number;
  who: Examinee;
  members: Examinee[];
  cards: DrawnCard[];
  note: string | null;
};

export type SessionState = {
  hotId: string | null;
  people: PersonRound[];
  pools: Pools;
  remaining: string[];
  memberPairs: Examinee[][];
};

export function freshPools(): Pools {
  return {
    hot: [...poolIds.hot],
    hard: [...poolIds.hard],
    twenty: [...poolIds.twenty],
    ask: [...poolIds.ask],
  };
}

export function freshSession(): SessionState {
  return {
    hotId: null,
    people: [],
    pools: freshPools(),
    remaining: roster.map((person) => person.id),
    memberPairs: planMemberPairs(),
  };
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
  ask: "单独提问",
};

const NOT_FOR_FIRST = "ask-9";

export function drawPerson(state: SessionState): SessionState {
  const pools: Pools = {
    hot: [...state.pools.hot],
    hard: [...state.pools.hard],
    twenty: [...state.pools.twenty],
    ask: [...state.pools.ask],
  };
  const notes: string[] = [];

  const hard = take(pools.hard, poolIds.hard, []);
  pools.hard = hard.pool;
  if (hard.recycled) notes.push("难题已抽完，开始新一轮");

  const twenty = take(pools.twenty, poolIds.twenty, []);
  pools.twenty = twenty.pool;
  if (twenty.recycled) notes.push("二十大题目已抽完，开始新一轮");

  const asks: DrawnCard[] = [];
  const takenAsk: string[] = [];
  const first = state.people.length === 0;
  const askSource = first ? poolIds.ask.filter((id) => id !== NOT_FOR_FIRST) : poolIds.ask;
  for (let i = 0; i < 2; i += 1) {
    const askPool = first ? pools.ask.filter((id) => id !== NOT_FOR_FIRST) : pools.ask;
    const picked = take(askPool, askSource, takenAsk);
    pools.ask = first && pools.ask.includes(NOT_FOR_FIRST) ? [...picked.pool, NOT_FOR_FIRST] : picked.pool;
    takenAsk.push(picked.id);
    if (picked.recycled && !notes.some((note) => note.startsWith("单独提问"))) {
      notes.push("单独提问已抽完，开始新一轮");
    }
    asks.push({ id: picked.id, kind: "ask", label: kindLabel.ask });
  }

  const cards: DrawnCard[] = [
    { id: hard.id, kind: "hard", label: kindLabel.hard },
    { id: twenty.id, kind: "twenty", label: kindLabel.twenty },
    ...asks,
  ];

  if (state.remaining.length === 0) return state;
  const remaining = [...state.remaining];
  const nameIndex = Math.floor(Math.random() * remaining.length);
  const who = rosterById[remaining[nameIndex]!]!;
  remaining.splice(nameIndex, 1);

  const [membersForRound, ...memberPairs] = state.memberPairs;

  return {
    ...state,
    pools,
    remaining,
    memberPairs,
    people: [
      ...state.people,
      {
        n: state.people.length + 1,
        who,
        members: membersForRound ?? [],
        cards,
        note: notes.length ? notes.join("；") : null,
      },
    ],
  };
}
