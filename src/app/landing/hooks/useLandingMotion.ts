import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useHeroParallax(container: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const media = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!media.matches) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax-depth]"));
    const setters = layers.map((layer) => ({
      depth: Number(layer.dataset.parallaxDepth || 1),
      x: gsap.quickTo(layer, "x", { duration: 0.65, ease: "power3.out" }),
      y: gsap.quickTo(layer, "y", { duration: 0.65, ease: "power3.out" }),
    }));

    const move = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      setters.forEach((setter) => {
        setter.x(x * setter.depth * 15);
        setter.y(y * setter.depth * 12);
      });
    };
    const reset = () => setters.forEach((setter) => {
      setter.x(0);
      setter.y(0);
    });

    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", reset);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
    };
  }, [container]);
}

export function useTimelineProgress(container: React.RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const progress = root.querySelector<HTMLElement>("[data-timeline-progress]");
    if (!progress) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(progress, { scaleY: 1 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        progress,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top 70%",
            end: "bottom 70%",
            scrub: 0.35,
          },
        },
      );
    }, root);
    return () => context.revert();
  }, [container]);
}
