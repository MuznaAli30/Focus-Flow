"use client";

import {
  createTaskRemote,
  deleteTaskRemote,
  fetchTasks,
  toggleTaskRemote,
  type TaskDTO,
} from "@/lib/api/tasks-client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Task = TaskDTO;

function TaskListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3.5 dark:border-zinc-800/80 dark:bg-zinc-900/40"
        >
          <div className="size-4 shrink-0 rounded bg-zinc-200/80 dark:bg-zinc-700/80" />
          <div className="h-4 flex-1 rounded-md bg-zinc-200/70 dark:bg-zinc-700/60" />
          <div className="h-8 w-16 shrink-0 rounded-lg bg-zinc-200/60 dark:bg-zinc-700/50" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/40 px-8 py-14 text-center dark:border-zinc-700/80 dark:bg-zinc-900/30">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <svg
          className="size-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664M5.25 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm6.75 0a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">
        No tasks yet
      </p>
      <p className="mt-1.5 max-w-[240px] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Add your first task above. Everything you save stays in your database.
      </p>
    </div>
  );
}

export function TaskTracker() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");

  const [initialLoading, setInitialLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());

  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSeq = useRef(0);
  const hasInitialFetch = useRef(false);

  const refreshTasks = useCallback(async () => {
    const seq = ++refreshSeq.current;
    if (hasInitialFetch.current) setIsRefreshing(true);
    try {
      const data = await fetchTasks();
      if (seq !== refreshSeq.current) return;
      setTasks(data);
      setListError(null);
    } catch (e) {
      if (seq !== refreshSeq.current) return;
      const message = e instanceof Error ? e.message : "Failed to load tasks";
      setListError(message);
    } finally {
      if (seq === refreshSeq.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      await refreshTasks();
      hasInitialFetch.current = true;
      if (!cancelled) setInitialLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTasks]);

  function setBusy(id: string, on: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || adding) return;
    setActionError(null);
    setAdding(true);
    try {
      await createTaskRemote(text);
      setInput("");
      await refreshTasks();
      setActionError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create task";
      setActionError(message);
      await refreshTasks();
    } finally {
      setAdding(false);
    }
  }

  async function toggleCompleted(id: string) {
    if (busyIds.has(id)) return;
    setActionError(null);
    setBusy(id, true);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    );
    try {
      await toggleTaskRemote(id);
      await refreshTasks();
      setActionError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update task";
      setActionError(message);
      await refreshTasks();
    } finally {
      setBusy(id, false);
    }
  }

  async function handleDelete(id: string) {
    if (busyIds.has(id)) return;
    setActionError(null);
    setBusy(id, true);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTaskRemote(id);
      await refreshTasks();
      setActionError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not delete task";
      setActionError(message);
      await refreshTasks();
    } finally {
      setBusy(id, false);
    }
  }

  async function handleRetryList() {
    setRetrying(true);
    try {
      await refreshTasks();
    } finally {
      setRetrying(false);
    }
  }

  const showAlerts = Boolean(listError || actionError);
  const listFailedEmpty = Boolean(listError && tasks.length === 0 && !initialLoading);

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-950 dark:ring-white/10">
      {isRefreshing ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-zinc-200/80 dark:bg-zinc-800"
          aria-hidden
        >
          <div className="h-full w-full animate-pulse bg-emerald-500/70 dark:bg-emerald-400/60" />
        </div>
      ) : null}

      <div className="px-8 pb-10 pt-9 sm:px-10 sm:pb-11 sm:pt-10">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            FocusFlow - Task Tracker
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Capture work, check it off, keep momentum.
          </p>
        </header>

        {showAlerts ? (
          <div
            className="mb-6 space-y-3"
            role="alert"
            aria-live="polite"
          >
            {listError ? (
              <div className="rounded-xl border border-red-200/90 bg-red-50/95 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/35">
                <div className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-red-600 dark:text-red-400">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1 text-left text-sm text-red-900 dark:text-red-100">
                    <p className="font-medium">Couldn&apos;t load tasks</p>
                    <p className="mt-1 text-red-800/90 dark:text-red-200/90">
                      {listError}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleRetryList()}
                      disabled={retrying}
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-900 shadow-sm ring-1 ring-red-200 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-950 dark:text-red-50 dark:ring-red-800 dark:hover:bg-red-900/80"
                    >
                      {retrying ? "Retrying…" : "Retry"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {actionError ? (
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
                    <svg className="size-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1 text-left text-sm text-amber-950 dark:text-amber-100">
                    <p className="font-medium">Action didn&apos;t complete</p>
                    <p className="mt-1 text-amber-900/85 dark:text-amber-100/85">
                      {actionError}
                    </p>
                    <button
                      type="button"
                      onClick={() => setActionError(null)}
                      className="mt-3 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <form
          onSubmit={handleAdd}
          className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-stretch"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What needs doing?"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-[15px] text-zinc-900 outline-none ring-emerald-500/25 transition placeholder:text-zinc-400 focus:border-emerald-500/80 focus:bg-white focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-emerald-500/70 dark:focus:bg-zinc-950"
            disabled={adding || initialLoading}
            aria-label="New task"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={adding || initialLoading || !input.trim()}
            aria-busy={adding}
            className="inline-flex min-h-11 min-w-[7.5rem] shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus-visible:outline-emerald-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          >
            {adding ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
                Adding
              </span>
            ) : (
              "Add Task"
            )}
          </button>
        </form>

        <section aria-busy={initialLoading || isRefreshing}>
          {initialLoading ? (
            <div className="space-y-2">
              <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                Loading tasks
              </p>
              <TaskListSkeleton />
            </div>
          ) : listFailedEmpty ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/30 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/25">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Tasks couldn&apos;t be loaded
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Check your connection and database, then retry above.
              </p>
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2.5">
              {tasks.map((task) => {
                const rowBusy = busyIds.has(task.id);
                return (
                  <li
                    key={task.id}
                    className={`group flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3.5 py-3 transition hover:border-zinc-200/90 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/35 dark:hover:border-zinc-700 ${rowBusy ? "opacity-60" : ""}`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => void toggleCompleted(task.id)}
                        disabled={rowBusy}
                        className="size-[1.125rem] shrink-0 rounded border-zinc-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-wait dark:border-zinc-600 dark:bg-zinc-950 dark:focus:ring-emerald-400/30"
                        aria-label={
                          task.completed ? "Mark incomplete" : "Mark complete"
                        }
                      />
                      <span
                        className={`min-w-0 truncate text-[15px] leading-snug ${
                          task.completed
                            ? "text-zinc-400 line-through dark:text-zinc-500"
                            : "text-zinc-800 dark:text-zinc-100"
                        }`}
                      >
                        {task.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleDelete(task.id)}
                      disabled={rowBusy}
                      aria-busy={rowBusy}
                      aria-label={
                        rowBusy ? "Deleting task" : `Delete: ${task.text}`
                      }
                      className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-wait disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    >
                      {rowBusy ? (
                        <span
                          className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300"
                          aria-hidden
                        />
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
