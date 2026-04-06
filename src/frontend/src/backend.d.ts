import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Order {
    id: bigint;
    customerName: string;
    status: OrderStatus;
    customerPhone: string;
    createdAt: Time;
    totalAmount: bigint;
    shippingAddress: string;
    customerId: Principal;
    items: Array<OrderItem>;
    customerEmail: string;
    upiTransactionId: string | null;
}
export type Time = bigint;
export interface OrderItem {
    productId: bigint;
    quantity: bigint;
    priceAtOrder: bigint;
}
export interface UserProfile {
    name: string;
    email: string;
    address: string;
    phone: string;
}
export interface SiteContent {
    homepageTitle: string;
    bannerText: string;
    aboutSection: string;
    contactInfo: string;
}
export interface Product {
    id: bigint;
    stockQuantity: bigint;
    name: string;
    description: string;
    isActive: boolean;
    imageUrl: string;
    category: ProductCategory;
    priceCents: bigint;
}
export enum OrderStatus {
    shipped = "shipped",
    cancelled = "cancelled",
    pending = "pending",
    delivered = "delivered",
    processing = "processing"
}
export enum ProductCategory {
    book = "book",
    incense = "incense"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addProduct(product: Product): Promise<Product>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteProduct(id: bigint): Promise<void>;
    getAllActiveProducts(): Promise<Array<Product>>;
    getAllOrders(): Promise<Array<Order>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getOrder(id: bigint): Promise<Order>;
    getPhoneNumber(token: string): Promise<string | null>;
    getProduct(id: bigint): Promise<Product>;
    getProductsByCategory(category: ProductCategory): Promise<Array<Product>>;
    getSiteContent(): Promise<SiteContent>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    placeOrder(order: Order): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    savePhoneNumber(token: string, phone: string): Promise<void>;
    sendOtp(phone: string): Promise<string>;
    updateOrderStatus(id: bigint, status: OrderStatus): Promise<void>;
    updateProduct(id: bigint, product: Product): Promise<Product>;
    updateSiteContent(content: SiteContent): Promise<void>;
    verifyOtp(phone: string, otp: string): Promise<string>;
}
