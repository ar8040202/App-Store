export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean | number;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  details: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  image_url: string | null;
  gallery: string | null;
  sizes: string | null;
  colors: string | null;
  category_id: number | null;
  is_active: boolean | number;
  is_featured: boolean | number;
  rating: number | null;
  reviews_count: number | null;
  category?: Category | null;
};

export type Settings = Record<string, string>;

export type Governorate = {
  id: number;
  name: string;
  fee: number;
  is_active: boolean | number;
  sort_order: number;
};

export type PaymentMethod = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean | number;
  sort_order: number;
};

export type OrderItem = {
  product_id: number;
  product_name: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  governorate: string;
  city: string;
  address: string;
  notes: string | null;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  stock_restored: boolean;
  created_at: string;
  items?: OrderItem[];
};

export type Catalog = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  governorates: Governorate[];
  paymentMethods: PaymentMethod[];
};

export type CreateOrderInput = {
  customer_name: string;
  customer_phone: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string;
  payment_method: string;
  items: { product_id: number; quantity: number }[];
};
