"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CarouselItem {
  id: string;
  title: string;
  city: string;
  country: string;
  theme: string;
  imageUrl: string;
  alt: string;
  ctaLabel: string;
  anchor: string;
}

const MAPVIBE_ITEMS: CarouselItem[] = [
  {
    id: "barcelona-med",
    title: "Barcelona Med Vibes",
    city: "Barcelona",
    country: "Spain",
    theme: "Mediterranean Warmth",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/barcelona_med_vibes_mockup.jpg",
    alt: "Barcelona map art print in Mediterranean style",
    ctaLabel: "Create this map",
    anchor: "barcelona",
  },
  {
    id: "mv-067904",
    title: "City Cartography I",
    city: "MapVibe",
    country: "Original",
    theme: "Architectural Lines",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-067904951f24.jpg",
    alt: "MapVibe architectural cartography print",
    ctaLabel: "Create this map",
    anchor: "cartography-1",
  },
  {
    id: "mv-140964",
    title: "Urban Grid Study",
    city: "MapVibe",
    country: "Original",
    theme: "Scandinavian Minimal",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-140964aeb845.jpg",
    alt: "Urban grid minimal map print",
    ctaLabel: "Create this map",
    anchor: "urban-grid",
  },
  {
    id: "mv-4a2511",
    title: "Street Pattern III",
    city: "MapVibe",
    country: "Original",
    theme: "Japandi Neutral",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-4a2511d925ec.jpg",
    alt: "Japandi street pattern map print",
    ctaLabel: "Create this map",
    anchor: "street-pattern",
  },
  {
    id: "mv-57ce3a",
    title: "Cartographic Essay",
    city: "MapVibe",
    country: "Original",
    theme: "Editorial Dark",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-57ce3abe58be.jpg",
    alt: "Editorial dark cartographic map print",
    ctaLabel: "Create this map",
    anchor: "cartographic-essay",
  },
  {
    id: "mv-6e944f",
    title: "District Composition",
    city: "MapVibe",
    country: "Original",
    theme: "Warm Neutral",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-6e944f6a8d46.jpg",
    alt: "District composition warm neutral map print",
    ctaLabel: "Create this map",
    anchor: "district-comp",
  },
  {
    id: "mv-8272c2",
    title: "Topographic Study",
    city: "MapVibe",
    country: "Original",
    theme: "Monochrome Luxury",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-8272c20f5b5e.jpg",
    alt: "Monochrome topographic luxury map print",
    ctaLabel: "Create this map",
    anchor: "topo-study",
  },
  {
    id: "mv-a0ed9a",
    title: "Meridian Print",
    city: "MapVibe",
    country: "Original",
    theme: "Gallery White",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-a0ed9a140f98.jpg",
    alt: "Meridian gallery white map print",
    ctaLabel: "Create this map",
    anchor: "meridian",
  },
  {
    id: "mv-a1b613",
    title: "Quarter Study",
    city: "MapVibe",
    country: "Original",
    theme: "Soft Ivory",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-a1b613ff7978.jpg",
    alt: "Soft ivory quarter study map print",
    ctaLabel: "Create this map",
    anchor: "quarter-study",
  },
  {
    id: "mv-aa3f41",
    title: "Atlas No. 1",
    city: "MapVibe",
    country: "Original",
    theme: "Collector Edition",
    imageUrl: "https://raw.githubusercontent.com/insforca/mapvibe-gallery/main/images/mv-aa3f41eb0ae3.jpg",
    alt: "Collector edition atlas map print",
    ctaLabel: "Create this map",
    anchor: "atlas-1",
  },
];

const VISIBLE = 5; // cards visible at once (center + 2 each side)
const CARD_W = 320;
const CARD_H = 420;

export default function GalleryCarousel() {
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  const total = MAPVIBE_ITEMS.length;

  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next]);

  // Touch / drag
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    setIsDragging(false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = e.clientX - dragStart.current;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    dragStart.current = null;
  };

  // Compute relative position (-2 .. 0 .. +2) for each card
  function relPos(idx: number) {
    let d = idx - active;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  }

  const SPREAD = 240;      // horizontal offset per step
  const DEPTH = 80;        // Z push-back per step
  const ROTATE_Y = 42;     // degrees of rotation per step
  const SCALE_STEP = 0.14; // scale drop per step

  const item = MAPVIBE_ITEMS[active];

  return (
    <section
      id="gallery-carousel"
      className="py-24 md:py-32 overflow-hidden"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-20 gap-6">
          <div>
            <p className="label-text mb-4" style={{ color: "var(--warm-gray)" }}>
              The Collection
            </p>
            <h2
              className="font-serif text-5xl md:text-6xl leading-none"
              style={{ color: "var(--matte-black)", fontWeight: 300 }}
            >
              Cities, curated
              <br />
              <em style={{ fontStyle: "italic" }}>for your walls.</em>
            </h2>
          </div>
          <p
            className="text-sm max-w-xs leading-relaxed md:text-right"
            style={{ color: "var(--warm-gray)", fontWeight: 300 }}
          >
            Each piece is generated from real cartographic data and styled
            for quiet, editorial spaces.
          </p>
        </div>

        {/* Carousel stage */}
        <div
          className="relative select-none"
          style={{ height: CARD_H + 120 }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          {/* Perspective container */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ perspective: "1200px" }}
          >
            {MAPVIBE_ITEMS.map((card, idx) => {
              const d = relPos(idx);
              const abs = Math.abs(d);
              if (abs > Math.floor(VISIBLE / 2) + 1) return null; // cull off-screen

              const tx = d * SPREAD;
              const tz = -abs * DEPTH;
              const ry = d * ROTATE_Y;
              const scale = 1 - abs * SCALE_STEP;
              const opacity = abs > Math.floor(VISIBLE / 2) ? 0 : 1 - abs * 0.18;
              const zIndex = 10 - abs;

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    if (d === 0) return;
                    d < 0 ? prev() : next();
                  }}
                  style={{
                    position: "absolute",
                    width: CARD_W,
                    height: CARD_H,
                    transform: `translateX(${tx}px) translateZ(${tz}px) rotateY(${ry}deg) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: "transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.55s ease",
                    opacity,
                    zIndex,
                    cursor: d === 0 ? "default" : "pointer",
                  }}
                >
                  {/* Card */}
                  <div
                    className="w-full h-full rounded-sm overflow-hidden"
                    style={{
                      background: "var(--ivory)",
                      boxShadow:
                        d === 0
                          ? "0 24px 64px rgba(26,24,20,0.18), 0 4px 16px rgba(26,24,20,0.08)"
                          : "0 8px 24px rgba(26,24,20,0.1)",
                    }}
                  >
                    {/* Image */}
                    <div className="relative overflow-hidden" style={{ height: CARD_H - 100 }}>
                      <img
                        src={card.imageUrl}
                        alt={card.alt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                      {/* Active card overlay */}
                      {d === 0 && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(26,24,20,0.5) 0%, transparent 55%)",
                          }}
                        />
                      )}
                    </div>

                    {/* Card meta (only on active) */}
                    <div className="px-5 py-4" style={{ height: 100 }}>
                      <p
                        className="label-text"
                        style={{ color: "var(--walnut)", fontSize: "0.6rem" }}
                      >
                        {card.city} — {card.country}
                      </p>
                      <h3
                        className="font-serif text-lg leading-snug mt-1"
                        style={{ color: "var(--matte-black)", fontWeight: 400 }}
                      >
                        {card.title}
                      </h3>
                      <p
                        className="label-text mt-1"
                        style={{ color: "var(--warm-gray)", fontSize: "0.58rem" }}
                      >
                        {card.theme}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-8 mt-6">
          {/* Prev */}
          <button
            onClick={prev}
            aria-label="Previous artwork"
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: 44,
              height: 44,
              border: "1px solid var(--sand)",
              background: "transparent",
              color: "var(--matte-black)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--matte-black)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ivory)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--matte-black)";
            }}
          >
            ←
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {MAPVIBE_ITEMS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  width: idx === active ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: idx === active ? "var(--matte-black)" : "var(--sand)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "all 0.35s ease",
                }}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={next}
            aria-label="Next artwork"
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: 44,
              height: 44,
              border: "1px solid var(--sand)",
              background: "transparent",
              color: "var(--matte-black)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--matte-black)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ivory)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--matte-black)";
            }}
          >
            →
          </button>
        </div>

        {/* Active card CTA */}
        <div className="flex justify-center mt-10">
          <a
            href="#hero"
            className="inline-flex items-center gap-3 px-8 py-4 text-xs hero-cta-primary"
            style={{
              background: "var(--matte-black)",
              color: "var(--ivory)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
            aria-label={`Create a custom ${item.title}`}
          >
            {item.ctaLabel} — {item.city}
            <span style={{ fontSize: "1rem" }}>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
