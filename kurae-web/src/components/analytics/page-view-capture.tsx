"use client";

import { useEffect, useRef } from "react";

type PageViewCaptureProps = {
  dropId: string;
};

export function PageViewCapture({ dropId }: PageViewCaptureProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!dropId || tracked.current) return;
    tracked.current = true;

    void fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId }),
    }).catch(() => {
      tracked.current = false;
    });
  }, [dropId]);

  return null;
}
