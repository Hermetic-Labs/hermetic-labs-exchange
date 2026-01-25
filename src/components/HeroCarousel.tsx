import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface Props {
  products: Product[];
}

export function HeroCarousel({ products }: Props) {
  const [current, setCurrent] = useState(0);

  // Use first 3 products for the carousel, or fewer if not enough products
  const slides = products.slice(0, 3);

  useEffect(() => {
    if (slides.length === 0) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent((current - 1 + slides.length) % slides.length);
  const next = () => setCurrent((current + 1) % slides.length);

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full aspect-[2/1] max-h-[400px] overflow-hidden rounded-lg cyber-card">
      {slides.map((product, index) => {
        const heroImage = product.media[0]?.url || `${import.meta.env.BASE_URL}images/connector-placeholder.svg`;

        return (
          <div
            key={product.id}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <img
              src={heroImage}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center px-8 md:px-16">
              <div className="max-w-lg">
                <span className="text-cyber-cyan text-sm uppercase tracking-wider mb-2 block">
                  {product.category}
                </span>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                  {product.title}
                </h2>
                <p className="text-gray-300 mb-4 line-clamp-2">{product.description}</p>
                <Link to={`/product/${product.slug}`} className="cyber-btn inline-block">
                  View Details
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation */}
      {slides.length > 1 && (
        <>
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
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
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
      )}
    </div>
  );
}
