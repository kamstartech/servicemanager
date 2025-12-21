import { EventEmitter } from 'events';

/**
 * Account Events Service
 * 
 * Central event emitter for account-related events.
 * Enables event-based architecture instead of polling/cron-based.
 * 
 * Usage:
 *   // Emit event
 *   accountEvents.emit(AccountEvent.USER_LOGIN, { userId: 123 });
 * 
 *   // Listen to event
 *   accountEvents.on(AccountEvent.USER_LOGIN, ({ userId }) => {
 *     // Handle event
 *   });
 */

export enum AccountEvent {
    // Account lifecycle
    ACCOUNT_DISCOVERED = 'account.discovered',
    ACCOUNT_LINKED = 'account.linked',
    ACCOUNT_UNLINKED = 'account.unlinked',

    // User lifecycle
    USER_REGISTERED = 'user.registered',
    USER_LOGIN = 'user.login',

    // Transactions
    TRANSACTION_COMPLETED = 'transaction.completed',
    TRANSACTION_FAILED = 'transaction.failed',

    // Manual admin triggers
    ADMIN_TRIGGER_SYNC = 'admin.trigger.sync',
    ADMIN_TRIGGER_DISCOVERY = 'admin.trigger.discovery',
    ADMIN_TRIGGER_ENRICHMENT = 'admin.trigger.enrichment',
}

export interface AccountEventPayload {
    userId?: number;
    accountId?: number;
    accountNumber?: string;
    transactionId?: string;
    context?: 'MOBILE_BANKING' | 'WALLET';
    metadata?: Record<string, any>;
    timestamp?: number;
}

class AccountEventEmitter extends EventEmitter {
    constructor() {
        super();
        // Increase max listeners to avoid warnings (multiple services listen to same events)
        this.setMaxListeners(20);
    }

    /**
     * Emit an account event
     * Automatically adds timestamp if not provided
     */
    emit(event: AccountEvent, payload: AccountEventPayload): boolean {
        const enrichedPayload = {
            ...payload,
            timestamp: payload.timestamp || Date.now(),
        };

        console.log(`📢 Event: ${event}`, {
            userId: enrichedPayload.userId,
            accountId: enrichedPayload.accountId,
            accountNumber: enrichedPayload.accountNumber,
        });

        return super.emit(event, enrichedPayload);
    }

    /**
     * Register event listener with error handling
     */
    on(event: AccountEvent, listener: (payload: AccountEventPayload) => void | Promise<void>): this {
        const wrappedListener = async (payload: AccountEventPayload) => {
            try {
                await listener(payload);
            } catch (error) {
                console.error(`❌ Error handling event ${event}:`, error);
                // Don't throw - we don't want one failing listener to break others
            }
        };

        return super.on(event, wrappedListener);
    }

    /**
     * Get list of registered events and their listener counts
     */
    getEventStats(): Record<string, number> {
        const stats: Record<string, number> = {};
        for (const event of Object.values(AccountEvent)) {
            stats[event] = this.listenerCount(event);
        }
        return stats;
    }
}

// Singleton instance
export const accountEvents = new AccountEventEmitter();

// Log event stats on startup
setTimeout(() => {
    console.log('📊 Event listeners registered:', accountEvents.getEventStats());
}, 5000);
