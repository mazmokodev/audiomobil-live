
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  featured: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  image: string;
}

export interface PageContent {
  id: string;
  slug: string; // e.g., 'about', 'terms'
  title: string;
  content: string;
}

export interface SiteConfig {
  shopName: string;
  logoUrl?: string; // Optional logo image URL (can be Base64)
  themeColor: string; // Hex color code
  whatsappNumber: string;
  address: string;
  email: string;
  welcomeMessage: string;
  footerDescription: string; // Dynamic footer text
  // Hero Section
  heroImage?: string; // New field for Hero Right Image
  // About Us Section
  aboutUsTitle: string;
  aboutUsContent: string;
  aboutUsImage: string;
}

export enum PageView {
  HOME = 'HOME',
  SHOP = 'SHOP',
  PRODUCT_DETAIL = 'PRODUCT_DETAIL',
  BLOG = 'BLOG',
  BLOG_DETAIL = 'BLOG_DETAIL',
  DYNAMIC_PAGE = 'DYNAMIC_PAGE',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
}