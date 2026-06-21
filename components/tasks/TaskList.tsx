import { TaskCard } from "./TaskCard";

type Task = { id: number; description: string; due_date: Date | string; status: string; assignedTo?: { name: string | null }; createdBy?: { name: string | null } };

export function TaskList({ tasks }: { tasks: Task[] }) {
  return <div className="grid gap-3">{tasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>;
}
