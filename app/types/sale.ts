type Product = {
  name: string;
  quantity: number;
  price: number;
};

export type Sale = {
  id: number;
  orderNumber: string;
  date: string;
  customer: string;
  customerEmail: string;
  amount: number;
  status: string;
  paymentStatus: string;
  items: number;
  products: Product[];
};