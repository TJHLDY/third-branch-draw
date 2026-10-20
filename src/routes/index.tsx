import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Moon, RotateCcw, Sun } from "lucide-react";
import { askQuestions, byId, hardQuestions, hotTopics, otherQuestions, twentyQuestions } from "@/lib/bank";
import { drawHot, drawPerson, freshSession, type DrawnCard, type PersonRound, type SessionState } from "@/lib/draw";

export const Route = createFileRoute("/")({ component: Home });

const STORAGE_KEY = "branch-interview-session-v2";
const DONE_KEY = "branch-interview-done-v2";
const THEME_KEY = "branch-interview-theme";
const HEADCOUNT = 14;

const LIGHT_BG = "#f3f3f1";
const DARK_BG = "#161616";
const PIXEL = 12;
let rippleToken = 0;

function playThemeRipple(origin: { x: number; y: number }, fromDark: boolean) {
  const token = ++rippleToken;
  const oldColor = fromDark ? DARK_BG : LIGHT_BG;
  const crest = fromDark ? "#4a4a4a" : "#bdbdb8";
  const width = window.innerWidth;
  const height = window.innerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.zIndex = "70";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const maxR =
    Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)) + PIXEL;
  const cols = Math.ceil(width / PIXEL);
  const rows = Math.ceil(height / PIXEL);
  const duration = 720;
  const start = performance.now();

  const nodes = document.querySelectorAll<HTMLElement>(
    "main section, main header, main article, main button, main details, main h1, main h2, .fixed",
  );
  nodes.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const ex = rect.left + rect.width / 2;
    const ey = rect.top + rect.height / 2;
    const dist = Math.hypot(ex - origin.x, ey - origin.y) || 1;
    const nx = (ex - origin.x) / dist;
    const ny = (ey - origin.y) / dist;
    el.animate(
      [
        { transform: "translate3d(0,0,0)" },
        { transform: `translate3d(${nx * 8}px, ${ny * 6}px, 0)`, offset: 0.3 },
        { transform: `translate3d(${nx * -4}px, ${ny * -3}px, 0)`, offset: 0.65 },
        { transform: "translate3d(0,0,0)" },
      ],
      { duration: 420, delay: (dist / maxR) * 480, easing: "ease-out" },
    );
  });

  const frame = (now: number) => {
    if (token !== rippleToken) {
      canvas.remove();
      return;
    }
    const t = Math.min(1, (now - start) / duration);
    const ease = 1 - (1 - t) ** 3;
    const radius = ease * maxR;
    ctx.clearRect(0, 0, width, height);
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * PIXEL + PIXEL / 2;
        const y = row * PIXEL + PIXEL / 2;
        const dx = x - origin.x;
        const dy = y - origin.y;
        const dist = Math.hypot(dx, dy) || 1;
        const wave = Math.sin(dist / 16 - t * 16);
        const boundary = radius + wave * 18;
        const half = PIXEL / 2;
        if (dist > boundary + 6) {
          const near = dist - boundary;
          let ox = x;
          let oy = y;
          if (near < 52) {
            const push = (1 - near / 52) * wave * 9;
            ox += (dx / dist) * push;
            oy += (dy / dist) * push;
          }
          ctx.fillStyle = oldColor;
          ctx.fillRect(ox - half, oy - half, PIXEL - 1, PIXEL - 1);
        } else if (dist > boundary - 24) {
          ctx.fillStyle = crest;
          ctx.fillRect(x + (dx / dist) * wave * 7 - half, y + (dy / dist) * wave * 7 - half, PIXEL - 1, PIXEL - 1);
        }
      }
    }
    if (t < 1) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

function Home() {
  const [session, setSession] = useState<SessionState>(freshSession);
  const [ready, setReady] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [done, setDone] = useState(false);
  const [night, setNight] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SessionState;
        if (parsed?.pools && Array.isArray(parsed.people)) {
          setSession(parsed);
          if (parsed.people.length >= HEADCOUNT && localStorage.getItem(DONE_KEY) === "1") setDone(true);
        }
      }
    } catch {
      /* ignore broken storage */
    }
    setReady(true);
    setNight(document.documentElement.dataset.theme === "dark");
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(DONE_KEY, done ? "1" : "0");
  }, [session, ready, done]);

  const current = session.people.at(-1) ?? null;
  const earlier = session.people.slice(0, -1).reverse();

  function setTheme(dark: boolean, origin?: { x: number; y: number }) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && origin) playThemeRipple(origin, night);
    setNight(dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pt-6 pb-28">
      <header className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-xl font-medium leading-tight text-fg">
          计算机学院学生第三支部
          <br />
          答辩谈话抽题
        </h1>
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center border border-line bg-surface text-fg"
          aria-pressed={night}
          aria-label={night ? "切换到白天" : "切换到黑夜"}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setTheme(!night, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }}
        >
          {night ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
        <Remain label="难题剩余" left={session.pools.hard.length} total={hardQuestions.length} />
        <Remain label="二十大剩余" left={session.pools.twenty.length} total={twentyQuestions.length} />
        <Remain label="其他题剩余" left={session.pools.other.length} total={otherQuestions.length} />
        <Remain label="单独提问剩余" left={session.pools.ask.length} total={askQuestions.length} />
      </section>

      <section className="rounded-sm border border-line bg-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">时事热点</h2>
          </div>
          <span className="border border-line px-2 py-1 text-xs text-muted">全员回答</span>
        </div>
        {session.hotId ? (
          <QuestionBlock
            label="时事热点"
            itemId={session.hotId}
            showAnswers={showAnswers}
          />
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-sm bg-accent px-4 text-sm font-medium text-accent-fg"
            onClick={() => {
              setSession((prev) => drawHot(prev));
              setConfirmReset(false);
            }}
          >
            {session.hotId ? "更换时事热点" : "抽取时事热点"}
          </button>
        </div>
      </section>

      <section id="person" className="mt-4 rounded-sm border border-line bg-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">{done ? "抽题结果" : "个人题目"}</h2>
          </div>
          <span className="text-xs text-muted">已抽 {session.people.length} / {HEADCOUNT} 人</span>
        </div>
        {done ? (
          <div className="flex flex-col gap-6">
            {session.people.map((person) => (
              <PersonCard key={person.n} person={person} showAnswers={showAnswers} />
            ))}
          </div>
        ) : current ? (
          <PersonCard person={current} showAnswers={showAnswers} current />
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            每位同学 6 题：1 道难题或二十大题、2 道其他党章题、3 道单独提问。点下面按钮给下一位抽一套新的。
          </p>
        )}
      </section>

      {!done && earlier.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-sm text-muted">前面已抽过的人</h2>
          <div className="flex flex-col gap-2">
            {earlier.map((person) => (
              <details key={person.n} className="rounded-sm border border-line bg-surface px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">第 {person.n} 位</summary>
                <div className="mt-3">
                  <PersonBody person={person} showAnswers={showAnswers} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-base font-medium">题库</h2>
        <Bank title="时事热点" items={hotTopics} />
        <Bank title="党章 · 难" items={hardQuestions} />
        <Bank title="党章 · 二十大" items={twentyQuestions} />
        <Bank title="党章 · 其他" items={otherQuestions} />
        <Bank title="单独提问 ②—⑭" items={askQuestions} />
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-sm bg-accent text-sm font-medium text-accent-fg disabled:bg-line disabled:text-muted"
            disabled={done}
            onClick={() => {
              if (session.people.length >= HEADCOUNT) {
                setDone(true);
                setConfirmReset(false);
                document.getElementById("person")?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              setSession((prev) => drawPerson(prev));
              setConfirmReset(false);
              document.getElementById("person")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            {done
              ? "考试已完成"
              : session.people.length >= HEADCOUNT
                ? "完成考试"
                : session.people.length === 0
                  ? "抽取第一位"
                  : "下一位"}
          </button>
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line bg-surface px-3 text-fg"
            aria-pressed={showAnswers}
            aria-label={showAnswers ? "隐藏参考答案" : "显示参考答案"}
            onClick={() => setShowAnswers((value) => !value)}
          >
            {showAnswers ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
          {confirmReset ? (
            <button
              type="button"
            className="min-h-11 rounded-sm border border-accent px-3 text-sm text-fg"
              onClick={() => {
                setSession(freshSession());
                setDone(false);
                setConfirmReset(false);
              }}
            >
              确认重置
            </button>
          ) : (
            <button
              type="button"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-line bg-surface text-muted"
              aria-label="重置本场"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Remain({ label, left, total }: { label: string; left: number; total: number }) {
  return (
    <div className="rounded-sm border border-line bg-surface px-3 py-2">
      <div className="text-fg">
        {left}
        <span className="text-muted"> / {total}</span>
      </div>
      <div>{label}</div>
    </div>
  );
}

function QuestionBlock({
  label,
  itemId,
  showAnswers,
}: {
  label: string;
  itemId: string;
  showAnswers: boolean;
}) {
  const item = byId[itemId];
  if (!item) return null;
  return (
    <article>
      <p className="mb-2 text-sm text-muted">{label}</p>
      <p className="text-base leading-relaxed">{item.q}</p>
      {showAnswers && (
        <p className="mt-3 rounded-sm bg-surface-2 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap text-muted">
          {item.a}
        </p>
      )}
    </article>
  );
}

function PersonCard({
  person,
  showAnswers,
  current,
}: {
  person: PersonRound;
  showAnswers: boolean;
  current?: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-base font-medium">{current ? `当前 · 第 ${person.n} 位` : `第 ${person.n} 位`}</p>
      {person.note && <p className="mb-3 text-sm text-muted">{person.note}</p>}
      <PersonBody person={person} showAnswers={showAnswers} />
    </div>
  );
}

function PersonBody({ person, showAnswers }: { person: PersonRound; showAnswers: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {person.cards.map((card, index) => (
        <Card key={`${person.n}-${card.id}`} index={index + 1} card={card} showAnswers={showAnswers} />
      ))}
    </div>
  );
}

function Card({ index, card, showAnswers }: { index: number; card: DrawnCard; showAnswers: boolean }) {
  const item = byId[card.id];
  if (!item) return null;
  return (
    <article className="rounded-sm border border-line bg-bg px-3 py-3">
      <p className="mb-1 text-sm text-muted">
        {index}. {card.label}
      </p>
      <p className="text-sm leading-relaxed">{item.q}</p>
      {showAnswers && <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-muted">{item.a}</p>}
    </article>
  );
}

function Bank({ title, items }: { title: string; items: { id: string; q: string }[] }) {
  return (
    <details className="mb-2 rounded-sm border border-line bg-surface px-4 py-3">
      <summary className="cursor-pointer text-sm">
        {title}
        <span className="ml-2 text-muted">{items.length}</span>
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm leading-relaxed text-muted">
            {item.q}
          </li>
        ))}
      </ul>
    </details>
  );
}
