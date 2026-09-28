import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { siteImage, HERO_WIDTHS } from "../utils/siteImages.js";
import styles from "./HeroCarousel.module.css";

// Module 1: advances every 5 seconds.
const SLIDE_MS = 5000;

// The three offers from the brief. `tone` = the photo's brightness behind
// the copy: "light" gets dark text, "dark" gets white text. `flip` mirrors
// the photo so the athlete sits on the right, away from the copy.
const SLIDES = [
  {
    id: "home-gym",
    eyebrow: "Home gym starter pack",
    title: ["Build your", "home gym"],
    description:
      "Dumbbells, a bench, bands and a mat. Everything you need to start training at home.",
    buttonText: "Shop the pack",
    link: "/products?category=Gym%20equipment",
    image: siteImage("hero-battle-ropes", HERO_WIDTHS),
    alt: "Athlete training with battle ropes in a grey studio",
    tone: "light",
    flip: true,
    position: "30% 50%",
  },
  {
    id: "cricket-season",
    eyebrow: "Cricket season kits",
    title: ["Season kits", "up to 30% off"],
    description:
      "Bats, pads, gloves and helmets for the new season, with discounts across the range.",
    buttonText: "Shop cricket",
    link: "/products?category=Cricket",
    image: siteImage("hero-cricket", HERO_WIDTHS),
    alt: "Batsman playing a drive in front of the stumps",
    tone: "dark",
    flip: true,
    position: "40% 40%",
  },
  {
    id: "yoga-day",
    eyebrow: "Yoga day offers",
    title: ["Yoga day", "offers"],
    description:
      "Mats, blocks, straps and bolsters for a calmer practice, at yoga day prices.",
    buttonText: "Shop yoga",
    link: "/products?category=Yoga",
    image: siteImage("hero-yoga", HERO_WIDTHS),
    alt: "Person holding a yoga pose against a sunset",
    tone: "dark",
    flip: true,
    position: "50% 60%",
  },
];

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Photos load for the current slide and the next one only, so the first
  // paint downloads one hero image instead of three.
  const [loaded, setLoaded] = useState(() => new Set([0, 1]));

  useEffect(() => {
    const next = (currentSlide + 1) % SLIDES.length;
    setLoaded((prev) =>
      prev.has(currentSlide) && prev.has(next)
        ? prev
        : new Set([...prev, currentSlide, next])
    );
  }, [currentSlide]);

  // Pauses while hovered or focused, and for shoppers who ask the OS for
  // reduced motion (the controls still work).
  const autoplay = !isPaused && !reduceMotion;

  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [autoplay, currentSlide]);

  function nextSlide() {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }

  function prevSlide() {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowRight") nextSlide();
    if (e.key === "ArrowLeft") prevSlide();
  }

  return (
    <section
      className={styles.hero}
      data-tone={SLIDES[currentSlide].tone}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Featured sports gear"
    >
      {SLIDES.map((slide, index) => {
        const isActive = index === currentSlide;
        const [lead, highlight] = slide.title;
        return (
          <div
            key={slide.id}
            className={`${styles.slide} ${styles[slide.tone]} ${isActive ? styles.active : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${SLIDES.length}`}
            aria-hidden={!isActive}
          >
            {loaded.has(index) && (
              <img
                className={`${styles.image} ${slide.flip ? styles.flip : ""}`}
                src={slide.image.src}
                srcSet={slide.image.srcSet}
                sizes="100vw"
                alt={slide.alt}
                style={{ objectPosition: slide.position }}
                fetchpriority={index === 0 ? "high" : "low"}
                decoding={index === 0 ? "sync" : "async"}
              />
            )}
            <div className={styles.scrim} aria-hidden="true" />

            <div className={`container ${styles.inner}`}>
              <div className={styles.content}>
                <p className={styles.eyebrow}>{slide.eyebrow}</p>
                {index === 0 ? (
                  <h1 className={styles.title}>
                    <span className={styles.lead}>{lead}</span>{" "}
                    <span className={styles.accent}>{highlight}</span>
                    <span className={styles.accent}>.</span>
                  </h1>
                ) : (
                  <h2 className={styles.title}>
                    <span className={styles.lead}>{lead}</span>{" "}
                    <span className={styles.accent}>{highlight}</span>
                    <span className={styles.accent}>.</span>
                  </h2>
                )}
                <p className={styles.description}>{slide.description}</p>
                <Link to={slide.link} className={styles.cta} tabIndex={isActive ? 0 : -1}>
                  {slide.buttonText}
                  <ArrowRightIcon size={18} weight="bold" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <div className={`container ${styles.controls}`}>
        <div className={styles.progress}>
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`${styles.bar} ${index === currentSlide ? styles.barActive : ""}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}: ${slide.eyebrow}`}
              aria-current={index === currentSlide ? "true" : undefined}
            >
              <span
                key={`${currentSlide}-${autoplay}`}
                className={`${styles.barFill} ${autoplay ? "" : styles.barPaused}`}
                style={{ animationDuration: `${SLIDE_MS}ms` }}
              />
            </button>
          ))}
        </div>

        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={prevSlide}
            aria-label="Previous slide"
          >
            <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.arrow}
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
