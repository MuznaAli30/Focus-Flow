import { TaskTracker } from "./components/TaskTracker";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-12 sm:px-6 sm:py-16 dark:from-zinc-950 dark:to-zinc-900">
      <TaskTracker />
    </div>
  );
}
