"use client";

import { useEffect, useRef } from "react";

/** Runs `callback` once when `isConfirmed` transitions from false to true. */
export function useOnConfirmed(isConfirmed: boolean, callback: () => void) {
  const wasConfirmed = useRef(false);

  useEffect(() => {
    if (isConfirmed && !wasConfirmed.current) callback();
    wasConfirmed.current = isConfirmed;
  }, [isConfirmed, callback]);
}
