import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Checkbox,
  Checkboxes,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "x-govuk-ui";

type Props = { side?: "left" | "right" | "top" | "bottom"; closeButton?: boolean };

const types = [
  ["premises", "Premises licence"],
  ["personal", "Personal licence"],
  ["temporary", "Temporary event notice"],
  ["street", "Street trading"],
] as const;

export default function SheetExample({ side = "right", closeButton = true }: Props) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  return (
    <>
      <Sheet side={side} open={open} onOpenChange={setOpen}>
        <SheetTrigger onClick={() => setChosen(applied)}>Filter licences</SheetTrigger>
        <SheetContent closeButton={closeButton} className="preview-sheet">
          <SheetTitle>Filter licences</SheetTitle>
          <SheetDescription>Show only the types you choose.</SheetDescription>
          <Checkboxes
            name="type"
            legend="Licence type"
            legendSize="small"
            small
            value={chosen}
            onValueChange={setChosen}
          >
            {types.map(([value, label]) => (
              <Checkbox key={value} value={value}>
                {label}
              </Checkbox>
            ))}
          </Checkboxes>
          <ButtonGroup>
            <Button
              onClick={() => {
                setApplied(chosen);
                setOpen(false);
              }}
            >
              Apply filters
            </Button>
            <SheetClose>Cancel</SheetClose>
          </ButtonGroup>
        </SheetContent>
      </Sheet>
      <p className="preview-message" role="status">
        {applied.length
          ? `Showing ${applied.length} of ${types.length} licence types.`
          : "Showing every licence type."}
      </p>
    </>
  );
}
