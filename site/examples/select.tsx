import { useState } from "react";
import { Select, SelectItem } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  size?: "medium" | "small";
};

export default function SelectExample({
  label = "Sort by",
  hint = "",
  hideLabel = false,
  errorMessage = "",
  disabled = false,
  size = "medium",
}: Props) {
  const [sort, setSort] = useState("published");
  return (
    <Select
      id="sort"
      name="sort"
      label={label}
      hint={hint || undefined}
      hideLabel={hideLabel}
      errorMessage={errorMessage || undefined}
      disabled={disabled}
      size={size}
      value={sort}
      onValueChange={setSort}
    >
      <SelectItem value="published">Recently published</SelectItem>
      <SelectItem value="updated">Recently updated</SelectItem>
      <PopularOrders />
    </Select>
  );
}

/**
 * Options from a component of your own, such as orders several lists share. The Select shows the
 * chosen one's label, as it does any other option's.
 */
function PopularOrders() {
  return (
    <>
      <SelectItem value="views">Most views</SelectItem>
      <SelectItem value="comments">Most comments</SelectItem>
    </>
  );
}
