import { type ReactNode, useEffect, useRef } from "react";

export const pagePadding = "px-5 py-7 sm:px-8 sm:py-9";

export function PageContent({
  children,
  viewport = false,
}: {
  children: ReactNode;
  viewport?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!viewport) {
      return;
    }
    const visual = window.visualViewport;
    const resize = () => {
      const element = container.current;
      if (element) {
        const top = Math.max(
          0,
          element.getBoundingClientRect().top - (visual?.offsetTop ?? 0)
        );
        element.style.setProperty(
          "--page-viewport-height",
          `${Math.max(0, (visual?.height ?? window.innerHeight) - top)}px`
        );
      }
    };
    resize();
    window.addEventListener("resize", resize);
    visual?.addEventListener("resize", resize);
    visual?.addEventListener("scroll", resize);
    return () => {
      window.removeEventListener("resize", resize);
      visual?.removeEventListener("resize", resize);
      visual?.removeEventListener("scroll", resize);
    };
  }, [viewport]);
  return (
    <div
      className={`mx-auto w-full max-w-7xl space-y-7 ${pagePadding} ${viewport ? "h-(--page-viewport-height) min-h-0 overflow-hidden" : ""}`}
      ref={container}
    >
      {children}
    </div>
  );
}
