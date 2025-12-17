"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isModifiedEvent(event: MouseEvent) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function findAnchor(element: Element | null): HTMLAnchorElement | null {
  let el: Element | null = element;
  while (el) {
    if (el instanceof HTMLAnchorElement) return el;
    el = el.parentElement;
  }
  return null;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  const intervalRef = React.useRef<number | null>(null);
  const doneTimeoutRef = React.useRef<number | null>(null);
  const startedRef = React.useRef(false);
  const startedAtRef = React.useRef<number>(0);

  const MIN_VISIBLE_MS = 450;

  const stopInterval = React.useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopDoneTimeout = React.useCallback(() => {
    if (doneTimeoutRef.current !== null) {
      window.clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    stopInterval();
    stopDoneTimeout();
    startedRef.current = true;
    startedAtRef.current = Date.now();
    setVisible(true);
    setProgress(15);

    intervalRef.current = window.setInterval(() => {
      setProgress((p: number) => {
        if (p >= 90) return p;
        const step = Math.max(1, Math.round((90 - p) * 0.08));
        return Math.min(90, p + step);
      });
    }, 120);
  }, [stopDoneTimeout, stopInterval]);

  const done = React.useCallback(() => {
    if (!startedRef.current) return;

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

    stopDoneTimeout();

    doneTimeoutRef.current = window.setTimeout(() => {
      startedRef.current = false;
      stopInterval();

      setProgress(100);
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, remaining);
  }, [stopDoneTimeout, stopInterval]);

  React.useEffect(() => {
    done();
  }, [pathname, searchParams, done]);

  React.useEffect(() => {
    const shell = document.getElementById("fdh-app-shell");
    if (!shell) return;

    if (visible) {
      shell.classList.add("fdh-app-shell--loading");
    } else {
      shell.classList.remove("fdh-app-shell--loading");
    }
  }, [visible]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (isModifiedEvent(event)) return;

      const anchor = findAnchor(event.target as Element | null);
      if (!anchor) return;

      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      const isSameRoute = url.pathname === current.pathname && url.search === current.search;
      if (isSameRoute) return;

      start();
    };

    const onPopState = () => {
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      stopDoneTimeout();
      stopInterval();
    };
  }, [start, stopDoneTimeout, stopInterval]);

  return (
    <>
      <div
        className={`fdh-nav-overlay ${visible ? "fdh-nav-overlay--visible" : ""}`}
        aria-hidden={!visible}
      >
        <div className="fdh-nav-overlay__content" role="status" aria-live="polite">
          <img
            className="fdh-nav-overlay__gif"
            src="/images/loader.gif"
            alt="Loading"
          />
        </div>
      </div>
      <div
        className={`fdh-nav-progress ${visible ? "fdh-nav-progress--visible" : ""}`}
        style={{ transform: `scaleX(${progress / 100})` }}
        aria-hidden={!visible}
      />
    </>
  );
}
