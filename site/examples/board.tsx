import { useState } from "react";
import { Board, BoardCard, BoardColumn, Tag, type TagColour } from "x-govuk-ui";

type Props = { markers?: boolean };

const stages: { value: string; label: string; colour: TagColour }[] = [
  { value: "introduced", label: "Introduced", colour: "grey" },
  { value: "meeting", label: "Meeting held", colour: "blue" },
  { value: "checks", label: "Checks done", colour: "teal" },
  { value: "agreement", label: "Agreement drafted", colour: "purple" },
  { value: "live", label: "Live", colour: "green" },
];

const start = [
  { id: "kittiwake", name: "Kittiwake Software", owner: "Lord Derby", stage: "introduced" },
  { id: "fenland", name: "Fenland Seed Company", owner: "Lord Derby", stage: "introduced" },
  { id: "solway", name: "Solway Wind Services", owner: "Benjamin Disraeli", stage: "introduced" },
  { id: "tamar", name: "Tamar Valley Foundry", owner: "Benjamin Disraeli", stage: "meeting" },
  { id: "cotswold", name: "Cotswold Glassworks", owner: "Lord Derby", stage: "meeting" },
  { id: "medway", name: "Medway Marine Engineering", owner: "Benjamin Disraeli", stage: "checks" },
  { id: "brecon", name: "Brecon Spring Water", owner: "Lord Derby", stage: "checks" },
  { id: "pennine", name: "Pennine Oat Mills", owner: "Benjamin Disraeli", stage: "agreement" },
  { id: "humber", name: "Humber Bioplastics", owner: "Lord Derby", stage: "live" },
  { id: "mersey", name: "Mersey Tool Hire", owner: "Benjamin Disraeli", stage: "live" },
];

export default function BoardExample({ markers = true }: Props) {
  const [companies, setCompanies] = useState(start);
  return (
    <Board
      label="Onboarding"
      // The card goes before the card named, or to the foot of its stage.
      onMove={(id, stage, before) =>
        setCompanies((current) => {
          const moving = current.find((company) => company.id === id);
          if (!moving) return current;
          const rest = current.filter((company) => company.id !== id);
          const at = before ? rest.findIndex((company) => company.id === before) : rest.length;
          return [...rest.slice(0, at), { ...moving, stage }, ...rest.slice(at)];
        })
      }
    >
      {stages.map((stage) => (
        <BoardColumn
          key={stage.value}
          value={stage.value}
          label={stage.label}
          marker={markers ? <Tag colour={stage.colour}>{stage.label.charAt(0)}</Tag> : undefined}
        >
          {companies
            .filter((company) => company.stage === stage.value)
            .map((company) => (
              <BoardCard key={company.id} value={company.id} label={company.name}>
                <strong>{company.name}</strong>
                <span>{`Owner: ${company.owner}`}</span>
              </BoardCard>
            ))}
        </BoardColumn>
      ))}
    </Board>
  );
}
