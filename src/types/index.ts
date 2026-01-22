export interface Author {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  socialLinks: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
  productCount: number;
  totalSales: number;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

export interface TechSpec {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  user: string;
  question: string;
  answer?: string;
  date: string;
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  helpful: number;
  verified?: boolean;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface DocumentationSummary {
  overview: string;
  exampleUseCase: string;
  whatMakesThisDifferent: string;
}

export interface DocumentationCard {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface ProductDocumentation {
  card?: DocumentationCard;
  summary?: DocumentationSummary;
  readme?: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPrice?: number;
  stripePriceId?: string;
  author: Author;
  category: string;
  media: MediaItem[];
  description: string;
  techSpecs: TechSpec[];
  links: { label: string; url: string }[];
  questions: Question[];
  reviews: Review[];
  rating: number;
  reviewCount: number;
  releaseDate: string;
  featured?: boolean;
  isNew?: boolean;
  downloadUrl?: string;
  documentation?: ProductDocumentation;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}
