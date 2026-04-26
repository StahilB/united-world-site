"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MascotIcon } from "./MascotIcon";

type Message = {
  role: "user" | "assistant";
  content: string;
  id: string;
};

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Мурр, приветствую! Я Мудрый Кот, помощник центра «Единый Мир». " +
    "Задай вопрос о геополитике, найди нужную статью или попроси объяснить термин.",
};

const QUICK_PROMPTS = [
  "Что такое АНО «Единый Мир»?",
  "Как найти статьи по региону?",
  "Последние материалы",
];

const USER_ERROR_TEMPORARY =
  "Помощник временно недоступен. Попробуйте еще раз через несколько секунд.";
const USER_ERROR_RETRY = "Не удалось получить ответ. Повторите запрос чуть позже.";

export function MascotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      inputRef.current?.focus();
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string, context?: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/mascot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              ...messages.filter((m) => m.id !== "welcome"),
              userMsg,
            ].map(({ role, content }) => ({ role, content })),
            context,
            pageUrl: typeof window !== "undefined" ? window.location.pathname : "/",
            pageTitle: typeof document !== "undefined" ? document.title : undefined,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error("RATE_LIMIT");
          }
          throw new Error("SERVICE_UNAVAILABLE");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m,
            ),
          );
        }

        if (!open) setHasUnread(true);
      } catch (e) {
        const error = e as Error;
        if (error.name !== "AbortError") {
          const uiMessage =
            error.message === "RATE_LIMIT"
              ? "Слишком много запросов. Подождите минуту."
              : error.message === "SERVICE_UNAVAILABLE"
                ? USER_ERROR_TEMPORARY
                : USER_ERROR_RETRY;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: uiMessage,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, open],
  );

  // Слушатель события mascot:ask (из TextSelectionPopup)
  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<{ text: string; context?: string }>;
      setOpen(true);
      if (detail?.text) {
        setTimeout(() => sendMessage(detail.text, detail.context), 100);
      }
    };
    window.addEventListener("mascot:ask", handler);
    return () => window.removeEventListener("mascot:ask", handler);
  }, [sendMessage]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Кнопка-триггер */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Свернуть чат с Мудрым Котом" : "Открыть чат с Мудрым Котом"}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink-deep text-gold shadow-lg transition-transform duration-200 hover:scale-[1.08]"
      >
        <MascotIcon size={32} />
        {hasUnread && (
          <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-ink-deep bg-alert animate-pulse" />
        )}
      </button>

      {/* Панель чата */}
      {open && (
        <div
          data-mascot-chat
          className="fixed bottom-[88px] right-6 z-50 flex w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden bg-white shadow-2xl"
          style={{ height: "min(520px, calc(100vh - 7.5rem))" }}
        >
          {/* Шапка */}
          <div className="flex shrink-0 items-center gap-3 bg-ink-deep px-4 py-3.5 text-white">
            <span className="text-gold">
              <MascotIcon size={28} />
            </span>
            <div className="flex-1">
              <p className="font-heading text-[14px] font-bold leading-none">
                Мудрый Кот
              </p>
              <p className="mt-1 font-sans text-[11px] text-white/60">
                Помощник «Единый Мир»
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Свернуть чат"
              className="text-white/70 transition-colors hover:text-white"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 13l7 3 7-3" />
              </svg>
            </button>
          </div>

          {/* Сообщения */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-paper-warm px-4 py-4"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words px-3.5 py-2.5 font-sans text-[14px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-gold text-ink-deep"
                      : "bg-white text-text"
                  }`}
                >
                  {m.content ||
                    (isStreaming && m.role === "assistant" ? "…" : "")}
                </div>
              </div>
            ))}

            {/* Quick prompts — только при первом экране */}
            {messages.length === 1 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    disabled={isStreaming}
                    className="w-fit bg-white px-3 py-2 text-left font-sans text-[13px] text-ink transition-colors hover:bg-gold-light disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ввод */}
          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 gap-2 border-t border-rule bg-white px-3 py-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Задайте вопрос..."
              rows={1}
              disabled={isStreaming}
              maxLength={1000}
              className="min-h-[36px] max-h-[100px] flex-1 resize-none border border-rule bg-white px-3 py-2 font-sans text-[14px] text-text placeholder:text-text-mute focus:border-gold focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              aria-label="Отправить"
              className="flex h-9 w-10 shrink-0 items-center justify-center self-end bg-gold text-ink-deep transition-colors hover:bg-gold-light disabled:opacity-50"
            >
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
