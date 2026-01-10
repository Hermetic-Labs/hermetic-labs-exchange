import { Star } from 'lucide-react';

interface Props {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function StarRating({ rating, size = 'md', showValue = true }: Props) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating);
        const partial = !filled && star === Math.ceil(rating) && rating % 1 > 0;

        return (
          <div key={star} className="relative">
            <Star
              className={`${sizes[size]} ${filled ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
            />
            {partial && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${(rating % 1) * 100}%` }}
              >
                <Star className={`${sizes[size]} text-yellow-500 fill-yellow-500`} />
              </div>
            )}
          </div>
        );
      })}
      {showValue && (
        <span className={`${textSizes[size]} text-gray-300 ml-1`}>{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
