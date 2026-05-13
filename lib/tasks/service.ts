import { prisma } from "@/lib/db";
import type { CreateTaskInput, TaskDTO, UpdateTaskInput } from "./types";

function toDTO(task: {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}): TaskDTO {
  return {
    id: task.id,
    text: task.text,
    completed: task.completed,
    createdAt: task.createdAt.toISOString(),
  };
}

export async function listTasks(): Promise<TaskDTO[]> {
  const rows = await prisma.task.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toDTO);
}

export async function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Task text is required");
  }
  const task = await prisma.task.create({
    data: { text },
  });
  return toDTO(task);
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<TaskDTO> {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  if (input.toggleCompleted === true) {
    const task = await prisma.task.update({
      where: { id },
      data: { completed: !existing.completed },
    });
    return toDTO(task);
  }

  const data: { text?: string; completed?: boolean } = {};
  if (input.text !== undefined) {
    const text = input.text.trim();
    if (!text) {
      throw new Error("Task text cannot be empty");
    }
    data.text = text;
  }
  if (input.completed !== undefined) {
    data.completed = input.completed;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("No valid fields to update");
  }

  const task = await prisma.task.update({
    where: { id },
    data,
  });
  return toDTO(task);
}

export async function deleteTask(id: string): Promise<void> {
  const result = await prisma.task.deleteMany({ where: { id } });
  if (result.count === 0) {
    throw new Error("NOT_FOUND");
  }
}
