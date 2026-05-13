import { NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/tasks/service";
import type { UpdateTaskInput } from "@/lib/tasks/types";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

function parseUpdateBody(json: unknown): UpdateTaskInput | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.toggleCompleted === true) {
    return { toggleCompleted: true };
  }
  const out: UpdateTaskInput = {};
  if (typeof o.text === "string") out.text = o.text;
  if (typeof o.completed === "boolean") out.completed = o.completed;
  if (out.text === undefined && out.completed === undefined) return null;
  return out;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const input = parseUpdateBody(json);
    if (!input) {
      return NextResponse.json(
        {
          error:
            "Invalid body: send toggleCompleted: true, and/or text, and/or completed",
        },
        { status: 400 },
      );
    }
    const task = await updateTask(id, input);
    return NextResponse.json(task);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (
      e instanceof Error &&
      (e.message === "Task text cannot be empty" ||
        e.message === "No valid fields to update")
    ) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteTask(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
