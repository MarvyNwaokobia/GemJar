"use client";

import { useEffect, useState } from "react";
import { isMiniPay } from "./utils";

/**
 * True once mounted inside the MiniPay in-app browser. Resolves after the
 * first render, since `window.ethereum` is only available on the client.
 */
export function useIsMiniPay(): boolean {
  const [miniPay, setMiniPay] = useState(false);

  useEffect(() => {
    setMiniPay(isMiniPay());
  }, []);

  return miniPay;
}
