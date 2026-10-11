"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function CinematicMotion() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let removeMouseMove = () => {};
    const context = gsap.context(() => {
      const home = document.querySelector(".cinematic-home");
      if (home) {
        const sections = gsap.utils.toArray<HTMLElement>(".cinematic-home .reveal");
        sections.forEach((section) => {
          const headings = section.querySelectorAll<HTMLElement>("h2");
          const copy = section.querySelectorAll<HTMLElement>("p:not(.eyebrow), .failure-chain, .capacity-card, .clock-card, .story-steps, .dark-cta, .text-link");
          headings.forEach((heading) => {
            const lines = heading.querySelectorAll<HTMLElement>(".cinematic-lines > span, .cinematic-lines > em > span");
            const parent = heading.closest<HTMLElement>(".story-section--left, .story-section--right, .risk-panel--left, .risk-panel--right");
            const fromX = parent?.classList.contains("story-section--left") || parent?.classList.contains("risk-panel--left") ? -42 : 42;
            const target = lines.length ? lines : heading;
            gsap.fromTo(target, {
              autoAlpha: 0,
              x: fromX,
              y: 70,
              rotateY: fromX > 0 ? 7 : -7,
              rotateX: -12,
              scale: 0.94,
              transformPerspective: 1000,
              transformOrigin: "center bottom",
            }, {
              autoAlpha: 1,
              x: 0,
              y: 0,
              rotateY: 0,
              rotateX: 0,
              scale: 1,
              duration: 1.35,
              ease: "power3.out",
              stagger: lines.length ? 0.12 : 0,
              scrollTrigger: { trigger: heading, start: "top 85%", once: true },
              onComplete: () => {
                gsap.to(heading, { y: -4, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
              },
            });
            heading.classList.add("float-idle");
          });
          if (copy.length) {
            gsap.fromTo(copy, { autoAlpha: 0, y: 34 }, {
              autoAlpha: 1,
              y: 0,
              duration: 1.05,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: { trigger: section, start: "top 82%", once: true },
            });
          }
          const image = section.querySelector<HTMLElement>(".story-photo img, .risk-panel > img, .shelter-photo img, .final-story > img");
          if (image) {
            gsap.fromTo(image, { scale: 1.12, yPercent: -4 }, {
              scale: 1,
              yPercent: 4,
              ease: "none",
              scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1.1 },
            });
          }
          const atmosphere = section.querySelector<HTMLElement>(".section-background-image");
          if (atmosphere) {
            gsap.fromTo(atmosphere, { scale: 1.08, yPercent: -3 }, {
              scale: 1,
              yPercent: 3,
              ease: "none",
              scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1.4 },
            });
          }
        });

        const hero = document.querySelector<HTMLElement>(".cinematic-hero");
        const heroImage = hero?.querySelector<HTMLElement>(".hero-photo");
        if (hero && heroImage) {
          gsap.to(heroImage, {
            yPercent: 10,
            scale: 1.02,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 1 },
          });
        }

        const progress = document.querySelector<HTMLElement>(".cascade-scroll-progress");
        if (progress) {
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (trigger) => gsap.set(progress, { scaleX: trigger.progress }),
          });
        }

        gsap.fromTo(".cinematic-hero h1", {
          autoAlpha: 0,
          y: 55,
          rotateX: -10,
          transformPerspective: 1000,
        }, {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          duration: 1.5,
          delay: 0.35,
          ease: "power3.out",
        });
      }

      const dashboard = document.querySelector(".simulation-command");
      if (dashboard) {
        // Real 3D depth and gentle scroll reveal for every heading on the simulation page.
        // This animation touches only DOM text; it never moves the WebGL camera.
        const headings = gsap.utils.toArray<HTMLElement>(".simulation-command h1, .simulation-command h2, .simulation-command h3");
        headings.forEach((heading, index) => {
          gsap.fromTo(heading, {
            autoAlpha: 0,
            y: 28,
            rotateX: -10,
            rotateY: index % 2 === 0 ? -4 : 4,
            transformPerspective: 1100,
            transformOrigin: "center bottom",
          }, {
            autoAlpha: 1,
            y: 0,
            rotateX: 0,
            rotateY: 0,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: heading, start: "top 93%", once: true },
            onComplete: () => {
              gsap.to(heading, { y: -2, duration: 5.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
            },
          });
        });
        gsap.fromTo(".simulation-command .ops-panel, .simulation-command .action-timeline", {
          autoAlpha: 0,
          y: 26,
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: ".simulation-command .ops-grid", start: "top 86%", once: true },
        });
        const progress = document.querySelector<HTMLElement>(".cascade-scroll-progress");
        if (progress) {
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (trigger) => gsap.set(progress, { scaleX: trigger.progress }),
          });
        }
      }

      if (window.matchMedia("(pointer: fine)").matches) {
        const headings = gsap.utils.toArray<HTMLElement>(".cinematic-home h1, .cinematic-home h2, .cinematic-home h3, .simulation-command h1, .simulation-command h2, .simulation-command h3");
        gsap.set(headings, { transformPerspective: 1000, transformStyle: "preserve-3d", transformOrigin: "50% 70%" });
        const moveHeading = (event: MouseEvent) => {
          const x = (event.clientX / window.innerWidth - 0.5) * 2;
          const y = (event.clientY / window.innerHeight - 0.5) * 2;
          headings.forEach((heading) => gsap.to(heading, {
            rotateY: x * 1.8,
            rotateX: y * -1.2,
            duration: 0.8,
            ease: "power3.out",
            overwrite: "auto",
          }));
        };
        window.addEventListener("mousemove", moveHeading, { passive: true });
        removeMouseMove = () => window.removeEventListener("mousemove", moveHeading);
      }
    });

    ScrollTrigger.refresh();
    return () => {
      removeMouseMove();
      context.revert();
    };
  }, []);

  return <div className="cascade-scroll-progress" aria-hidden="true" />;
}
