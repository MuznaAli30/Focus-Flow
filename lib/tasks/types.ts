export type TaskDTO = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

export type CreateTaskInput = {
  text: string;
};

export type UpdateTaskInput = {
  text?: string;
  completed?: boolean;
  toggleCompleted?: boolean;
};
