import { useEffect, useState } from "react";
import { TaskList, TaskListItem, type TaskStatus } from "x-govuk-ui";

type Props = { agent?: boolean; hints?: boolean };

const tasks = [
  { name: "Company details", href: "#company-details", hint: "Name, address and registration" },
  { name: "Contact details", href: "#contact-details" },
  { name: "List convictions", href: "#convictions", hint: "Include spent convictions" },
  { name: "Upload documents", href: "#documents" },
  { name: "Pay the fee", href: "#pay" },
];

const service: TaskStatus[] = ["completed", "completed", "in-progress", "error", "cannot-start"];

export default function TaskListExample({ agent = true, hints = false }: Props) {
  // As an agent, the tasks are worked through one at a time, and the list starts again at the
  // end.
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (!agent) return;
    setDone(0);
    const timer = setInterval(
      () => setDone((count) => (count >= tasks.length + 1 ? 0 : count + 1)),
      1500,
    );
    return () => clearInterval(timer);
  }, [agent]);
  // Where each task is. For an agent, that is as far as it has got. For a service, it is what its
  // data says.
  const statusOf = (index: number): TaskStatus => {
    if (!agent) return service[index] ?? "incomplete";
    if (index < done) return "completed";
    return index === done ? "working" : "not-started";
  };
  return (
    <TaskList>
      {tasks.map((task, index) => (
        <TaskListItem
          key={task.name}
          href={task.href}
          hint={hints ? task.hint : undefined}
          status={statusOf(index)}
        >
          {task.name}
        </TaskListItem>
      ))}
    </TaskList>
  );
}
