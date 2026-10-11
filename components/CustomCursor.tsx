"use client";

import { useEffect } from "react";

export default function CustomCursor() {
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const cursor = document.querySelector<HTMLElement>("[data-cursor-dot]");
    const follower = document.querySelector<HTMLElement>("[data-cursor-follower]");
    if (!cursor || !follower) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = targetX;
    let currentY = targetY;
    let frame = 0;
    let ready = false;

    const render = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      follower.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      cursor.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      frame = requestAnimationFrame(render);
    };

    const move = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!ready) {
        ready = true;
        document.documentElement.classList.add("cursor-ready");
      }
      document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
    };

    const over = (event: Event) => {
      const element = event.currentTarget as HTMLElement;
      document.documentElement.classList.add("cursor-hover");
      document.documentElement.style.setProperty("--cursor-label", `"${element.dataset.cursor ?? "EXPLORE"}"`);
    };
    const out = () => document.documentElement.classList.remove("cursor-hover");
    const interactive = document.querySelectorAll<HTMLElement>("a, button, [data-cursor]");
    const magnetic = document.querySelectorAll<HTMLElement>("[data-magnetic]");

    window.addEventListener("pointermove", move, { passive: true });
    interactive.forEach((element) => {
      element.addEventListener("pointerenter", over);
      element.addEventListener("pointerleave", out);
    });
    const magnetize = (event: Event) => {
      const pointer = event as PointerEvent;
      const element = pointer.currentTarget as HTMLElement;
      const bounds = element.getBoundingClientRect();
      const x = (pointer.clientX - (bounds.left + bounds.width / 2)) * 0.12;
      const y = (pointer.clientY - (bounds.top + bounds.height / 2)) * 0.12;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const releaseMagnet = (event: Event) => {
      (event.currentTarget as HTMLElement).style.transform = "";
    };
    magnetic.forEach((element) => {
      element.addEventListener("pointermove", magnetize);
      element.addEventListener("pointerleave", releaseMagnet);
    });
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      interactive.forEach((element) => {
        element.removeEventListener("pointerenter", over);
        element.removeEventListener("pointerleave", out);
      });
      magnetic.forEach((element) => {
        element.removeEventListener("pointermove", magnetize);
        element.removeEventListener("pointerleave", releaseMagnet);
      });
      document.documentElement.classList.remove("cursor-ready", "cursor-hover");
    };
  }, []);

  return (
    <>
      <span className="cursor-dot" data-cursor-dot aria-hidden="true" />
      <span className="cursor-follower" data-cursor-follower aria-hidden="true" />
    </>
  );
}
