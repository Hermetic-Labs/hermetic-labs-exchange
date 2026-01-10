import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Slide {
  image: string;
  title: string;
  subtitle: string;
  link: string;
  linkText: string;
}

const BASE = import.meta.env.BASE_URL;

const slides: Slide[] = [
  {
    image: `${BASE}images/hero-1.svg`,
    title: 'Enterprise Connectors',
    subtitle: 'AWS, Azure, GCP integrations ready to deploy',
    link: '/?category=Infrastructure',
    linkText: 'Browse Now',
  },
  {
    image: `${BASE}images/hero-2.svg`,
    title: 'Compliance Suites',
    subtitle: 'HIPAA, FedRAMP, PCI DSS ready modules',
    link: '/?category=Compliance',
    linkText: 'Explore',
  },
  {
    image: `${BASE}images/hero-3.svg`,
    title: 'VR/XR Components',
    subtitle: 'Immersive experiences for EVE-OS',
    link: '/?category=Immersive',
    linkText: 'Discover',
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((current - 1 + slides.length) % slides.length);
  const next = () => setCurrent((current + 1) % slides.length);

  return (
    <div className="relative w-full aspect-[2/1] max-h-[400px] overflow-hidden rounded-lg cyber-card">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center px-8 md:px-16">
            <div className="max-w-lg">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                {slide.title}
              </h2>
              <p className="text-gray-300 mb-4">{slide.subtitle}</p>
              <Link to={slide.link} className="cyber-btn inline-block">
                {slide.linkText}
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded backdrop-blur hover:bg-black/70 transition-colors"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded backdrop-blur hover:bg-black/70 transition-colors"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === current ? 'bg-cyber-green w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
