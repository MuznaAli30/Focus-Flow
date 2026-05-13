export type TaskDTO = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const NO_STORE = { cache: "no-store" as RequestCache };

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return typeof data.error === "string" ? data.error : res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Always hit the origin; avoids stale cached GET lists after mutations. */
export async function fetchTasks(): Promise<TaskDTO[]> {
  const res = await fetch("/api/tasks", NO_STORE);
  if (!res.ok) throw new Error(await readError(res));
  return res.json() as Promise<TaskDTO[]>;
}

export async function createTaskRemote(text: string): Promise<void> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    ...NO_STORE,
    headers: JSON_HEADERS,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export async function toggleTaskRemote(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PUT",
    ...NO_STORE,
    headers: JSON_HEADERS,
    body: JSON.stringify({ toggleCompleted: true }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export async function deleteTaskRemote(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE", ...NO_STORE });
  if (!res.ok) throw new Error(await readError(res));
}
