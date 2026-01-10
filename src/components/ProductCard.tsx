import { Link } from 'react-router-dom';
import { Product } from '../types';
import { Star } from 'lucide-react';
import { formatPrice } from '../lib/utils';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const thumbnail = product.media[0]?.url || '';

  return (
    <Link to={`/product/${product.slug}`} className="cyber-card overflow-hidden group">
      <div className="aspect-video relative overflow-hidden">
        <img
          src={thumbnail}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.isNew && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-cyber-cyan text-black text-xs font-bold rounded">
            NEW
          </span>
        )}
        {product.discountPrice && (
          <span className="absolute top-2 right-2 px-2 py-1 bg-cyber-pink text-white text-xs font-bold rounded">
            SALE
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1 truncate group-hover:text-cyber-green transition-colors">
          {product.title}
        </h3>
        <p className="text-sm text-gray-400 mb-2">{product.author.name}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm text-gray-300">{product.rating}</span>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>
          <div className="text-right">
            {product.discountPrice ? (
              <>
                <span className="text-gray-500 line-through text-sm mr-2">{formatPrice(product.price)}</span>
                <span className="text-cyber-green font-bold">{formatPrice(product.discountPrice)}</span>
              </>
            ) : (
              <span className="text-cyber-green font-bold">{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
