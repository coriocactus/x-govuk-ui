import { useRef, useState } from "react";
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "x-govuk-ui";

type Props = { closeButton?: boolean };

export default function DialogExample({ closeButton = true }: Props) {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  // Focus starts on Cancel, so pressing Enter straight away deletes nothing.
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger variant="warning" onClick={() => setDeleted(false)}>
          Delete draft
        </DialogTrigger>
        <DialogContent closeButton={closeButton} initialFocus={cancel}>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            You’ll lose the answers you’ve given so far. You cannot undo this.
          </DialogDescription>
          <ButtonGroup>
            <Button
              variant="warning"
              onClick={() => {
                setDeleted(true);
                setOpen(false);
              }}
            >
              Delete draft
            </Button>
            <DialogClose ref={cancel}>Cancel</DialogClose>
          </ButtonGroup>
        </DialogContent>
      </Dialog>
      <p className="preview-message" role="status">
        {deleted ? "Your draft has been deleted." : ""}
      </p>
    </>
  );
}
