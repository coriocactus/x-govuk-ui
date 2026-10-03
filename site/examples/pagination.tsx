import { useState } from "react";
import { Pagination } from "x-govuk-ui";

type Props = {
  pageCount?: number;
  /** Shows only Previous and Next, with the titles of their pages. */
  block?: boolean;
};

const guide = ["Overview", "Eligibility", "How to apply", "After you apply", "Appeals"];

export default function PaginationExample({ pageCount = 10, block = false }: Props) {
  const [page, setPage] = useState(5);
  const count = block ? guide.length : Math.max(1, pageCount);
  const current = Math.min(page, count);
  return (
    <div className="preview-pagination" data-block={block || undefined}>
      <p className="preview-hint">
        {block ? guide[current - 1] : `Results page ${current} of ${count}`}
      </p>
      <Pagination
        page={current}
        pageCount={count}
        href={(target) => `#page-${target}`}
        // The example changes the page in place, as a single-page application would.
        onPageChange={(target, event) => {
          event.preventDefault();
          setPage(target);
        }}
        block={block}
        previousLabel={guide[current - 2]}
        nextLabel={guide[current]}
      />
    </div>
  );
}
