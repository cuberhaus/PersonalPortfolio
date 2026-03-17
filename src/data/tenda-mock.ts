export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  stock: number;
}

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Camises" },
  { id: 2, name: "Pantalons" },
  { id: 3, name: "Sabates" },
  { id: 4, name: "Accessoris" },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 1, categoryId: 1, name: "Camisa blanca clàssica", description: "Camisa de cotó 100%, talla regular. Perfecta per a oficina.", price: 29.99, stock: 15 },
  { id: 2, categoryId: 1, name: "Camisa ratlles", description: "Camisa casual amb ratlles verticals. Tela suau i transpirable.", price: 24.50, stock: 8 },
  { id: 3, categoryId: 1, name: "Camisa polo", description: "Polo esportiu en diversos colors. Ideal per a dies càlids.", price: 19.99, stock: 22 },
  { id: 4, categoryId: 2, name: "Pantaló xino", description: "Pantaló xino còmode, talla estàndard. Tela resistent.", price: 34.99, stock: 12 },
  { id: 5, categoryId: 2, name: "Pantaló curt", description: "Pantaló curt d'estiu. Diversos colors disponibles.", price: 22.00, stock: 18 },
  { id: 6, categoryId: 2, name: "Pantaló formal", description: "Pantaló de vestir per a ocasions formals.", price: 49.99, stock: 6 },
  { id: 7, categoryId: 3, name: "Sabates esportives", description: "Sabates lleugeres per a córrer i caminar.", price: 59.99, stock: 10 },
  { id: 8, categoryId: 3, name: "Sabates de cuir", description: "Sabates formals de cuir autèntic.", price: 79.99, stock: 5 },
  { id: 9, categoryId: 3, name: "Espadrilles", description: "Espadrilles tradicionals catalanes. Còmodes per a l'estiu.", price: 27.50, stock: 20 },
  { id: 10, categoryId: 4, name: "Cinturó de cuir", description: "Cinturó de cuir marró, talla ajustable.", price: 24.99, stock: 14 },
  { id: 11, categoryId: 4, name: "Bufanda de llana", description: "Bufanda suau de llana natural. Colors variats.", price: 18.99, stock: 25 },
  { id: 12, categoryId: 4, name: "Carpesa", description: "Carpesa de cuir sintètic. Moltes butxaques.", price: 39.99, stock: 9 },
];
