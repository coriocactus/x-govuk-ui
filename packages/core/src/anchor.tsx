"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";

export type AnchorProps = ComponentPropsWithRef<"a"> & {
  /**
   * Renders a router's link in place of the anchor, keeping the part's look. Give an element, such
   * as `<NextLink />`, or a function that takes the anchor's props, such as
   * `(props) => <RouterLink to={props.href} {...props} />`.
   */
  render?: useRender.RenderProp;
};

/**
 * An anchor that a router's link can stand in for. Every link part in the library is one.
 * @internal
 */
export function Anchor({ render, ...props }: AnchorProps) {
  return useRender({ defaultTagName: "a", render, props });
}
