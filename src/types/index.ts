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
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPrice?: number;
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
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  productCount: number;
}
