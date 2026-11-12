import { useEffect, useState } from "react";

/**
 * A document the site makes from the library's source as it builds, such as a styling contract,
 * loaded when the panel that shows it opens. `slow` is set once it has taken a while, for a
 * skeleton to stand in for it only then. After a failure, `retry` loads it again.
 */
export function useLoaded<Document>(path: string) {
  const [loaded, setLoaded] = useState<{ path: string; document: Document }>();
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `retry` loads it once more.
  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    setSlow(false);
    const late = setTimeout(() => setSlow(true), 300);
    fetch(path, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`${path} is unavailable`);
        return response.json() as Promise<Document>;
      })
      .then((document) => setLoaded({ path, document }))
      .catch((error) => {
        if (error.name !== "AbortError") setFailed(true);
      })
      .finally(() => clearTimeout(late));
    return () => {
      controller.abort();
      clearTimeout(late);
    };
  }, [path, attempt]);

  return {
    // A document loaded for another path, such as the last component's, is not this one's.
    document: loaded?.path === path ? loaded.document : undefined,
    failed,
    slow,
    retry: () => setAttempt((value) => value + 1),
  };
}
