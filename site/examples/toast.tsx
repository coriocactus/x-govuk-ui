import { Button, ToastProvider, type ToastProviderProps, useToastManager } from "x-govuk-ui";

type Props = Pick<
  ToastProviderProps,
  "position" | "timeout" | "limit" | "dismiss" | "closeButton" | "countdown"
>;

export default function ToastExample({
  position = "top-center",
  timeout = 4000,
  limit = 4,
  dismiss = "tap",
  closeButton = false,
  countdown = true,
}: Props) {
  return (
    // A timeout of 0 keeps toasts open until someone dismisses them.
    <ToastProvider
      position={position}
      timeout={timeout}
      limit={limit}
      dismiss={dismiss}
      closeButton={closeButton}
      countdown={countdown}
    >
      <Triggers persistent={timeout === 0} />
    </ToastProvider>
  );
}

function Triggers({ persistent }: { persistent: boolean }) {
  const toasts = useToastManager();
  const general: [string, () => void][] = [
    ["Message", () => toasts.add({ title: "Draft saved to your account" })],
    [
      "Action",
      () => {
        const id = toasts.add({
          title: "Draft deleted",
          data: { sound: "destructive" },
          timeout: persistent ? 0 : 6000,
          actionProps: {
            children: "Undo",
            // The same toast changes in place, so the user sees their undo take effect.
            onClick: () =>
              toasts.update(id, {
                title: "Draft restored",
                type: "success",
                actionProps: undefined,
                timeout: persistent ? 0 : 2400,
              }),
          },
        });
      },
    ],
    [
      "Promise",
      () =>
        void toasts
          .promise(new Promise((resolve) => setTimeout(resolve, 1600)), {
            loading: "Saving your answers…",
            success: { title: "Answers saved" },
            error: { title: "Could not save your answers" },
          })
          .catch(() => {}),
    ],
  ];
  const outcomes: [string, () => void][] = [
    ["Success", () => toasts.add({ title: "Application submitted", type: "success" })],
    [
      "Error",
      () =>
        toasts.add({
          title: "Could not reach the service",
          type: "error",
          priority: "high",
        }),
    ],
    ["Warning", () => toasts.add({ title: "Your session ends in 5 minutes", type: "warning" })],
    ["Info", () => toasts.add({ title: "New guidance is available", type: "info" })],
  ];

  return (
    <div className="preview-toast-demos">
      {[general, outcomes].map((row) => (
        <div key={row[0]?.[0]} className="preview-toast-row">
          {row.map(([label, show]) => (
            // The toast that appears plays the matching sound, so the press itself stays quiet.
            <Button key={label} variant="secondary" size="small" data-sound="off" onClick={show}>
              {label}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
