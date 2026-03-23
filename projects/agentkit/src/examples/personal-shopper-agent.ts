import { BaseAgent } from '../core/base-agent';
import { ProductCatalog } from './product-catalog';
import { CartItem } from './cart-item';
import { OrderService } from './order-service';
import { Product } from './product';
import { Filter } from './filter';
import { Payment } from './payment';
import { Order } from './order';
import { OrderStatus } from './order-status';
import { ReturnLabel } from './return-label';
import { Comparison } from './comparison';
import { Alert } from './alert';

export class PersonalShopperAgent extends BaseAgent {
    productCatalog: ProductCatalog;
    cart: Map<string, CartItem>;
    orderService: OrderService;

    constructor() {
        super();
        this.productCatalog = null as any;
        this.cart = new Map();
        this.orderService = null as any;
    }

    async searchProducts(query: string, filters: Filter[]): Promise<Product[]> {
        if (!this.productCatalog) {
            throw new Error('Product catalog not initialized');
        }
        return await this.productCatalog.search(query, filters);
    }

    async getRecommendations(userId: string, category: string): Promise<Product[]> {
        if (!this.productCatalog) {
            throw new Error('Product catalog not initialized');
        }
        return await this.productCatalog.getRecommendations(userId, category);
    }

    async addToCart(productId: string, quantity: number): Promise<boolean> {
        if (!this.cart.has(productId)) {
            this.cart.set(productId, { productId, quantity });
        } else {
            const item = this.cart.get(productId)!;
            item.quantity += quantity;
        }
        return true;
    }

    async removeFromCart(productId: string): Promise<boolean> {
        return this.cart.delete(productId);
    }

    async updateCartQuantity(productId: string, quantity: number): Promise<boolean> {
        if (!this.cart.has(productId)) {
            return false;
        }
        const item = this.cart.get(productId)!;
        item.quantity = quantity;
        return true;
    }

    async getCartTotal(): Promise<number> {
        let total = 0;
        for (const item of this.cart.values()) {
            const product = await this.productCatalog.getProduct(item.productId);
            total += product.price * item.quantity;
        }
        return total * 1.08; // 8% tax
    }

    async applyPromoCode(code: string): Promise<number> {
        const discount = await this.productCatalog.validatePromoCode(code);
        return discount;
    }

    async checkout(payment: Payment): Promise<Order> {
        if (!this.orderService) {
            throw new Error('Order service not initialized');
        }
        const items = Array.from(this.cart.values());
        const order = await this.orderService.createOrder(items, payment);
        this.cart.clear();
        return order;
    }

    async trackOrder(orderId: string): Promise<OrderStatus> {
        if (!this.orderService) {
            throw new Error('Order service not initialized');
        }
        return await this.orderService.getOrderStatus(orderId);
    }

    async cancelOrder(orderId: string): Promise<boolean> {
        if (!this.orderService) {
            throw new Error('Order service not initialized');
        }
        return await this.orderService.cancelOrder(orderId);
    }

    async returnItem(orderId: string, itemId: string): Promise<ReturnLabel> {
        if (!this.orderService) {
            throw new Error('Order service not initialized');
        }
        return await this.orderService.initiateReturn(orderId, itemId);
    }

    async getWishlist(userId: string): Promise<Product[]> {
        if (!this.productCatalog) {
            throw new Error('Product catalog not initialized');
        }
        return await this.productCatalog.getWishlist(userId);
    }

    async addToWishlist(userId: string, productId: string): Promise<boolean> {
        if (!this.productCatalog) {
            throw new Error('Product catalog not initialized');
        }
        return await this.productCatalog.addToWishlist(userId, productId);
    }

    async compareProducts(productIds: string[]): Promise<Comparison> {
        if (!this.productCatalog) {
            throw new Error('Product catalog not initialized');
        }
        const products = await Promise.all(
            productIds.map(id => this.productCatalog.getProduct(id))
        );
        return {
            products,
            differences: this.analyzeDifferences(products)
        };
    }

    async getPriceAlerts(userId: string): Promise<Alert[]> {
        if (!this.productCatalog) {
            throw new Error('Product catalog not initialized');
        }
        return await this.productCatalog.getPriceAlerts(userId);
    }

    private analyzeDifferences(products: Product[]): string[] {
        const differences: string[] = [];
        if (products.length < 2) return differences;
        
        const first = products[0];
        for (let i = 1; i < products.length; i++) {
            const product = products[i];
            if (product.price !== first.price) {
                differences.push(`Price difference: $${Math.abs(product.price - first.price)}`);
            }
            if (product.brand !== first.brand) {
                differences.push(`Brand: ${product.brand} vs ${first.brand}`);
            }
        }
        return differences;
    }
}
