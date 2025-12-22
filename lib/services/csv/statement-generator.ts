/**
 * CSV Statement Generator
 * 
 * Generates account statements in CSV format
 */

import { T24StatementTransaction } from '../t24/statement';

export interface StatementCSVOptions {
    accountNumber: string;
    accountName: string;
    startDate: string;
    endDate: string;
    transactions: T24StatementTransaction[];
    openingBalance?: number;
    closingBalance?: number;
    currency: string;
}

export async function generateStatementCSV(
    options: StatementCSVOptions
): Promise<Buffer> {
    try {
        // Build CSV content
        const lines: string[] = [];

        // Header information
        lines.push('FDH BANK - Account Statement');
        lines.push('');
        lines.push(`Account Holder:,${escapeCSV(options.accountName)}`);
        lines.push(`Account Number:,${options.accountNumber}`);
        lines.push(`Statement Period:,${options.startDate} to ${options.endDate}`);
        lines.push(`Currency:,${options.currency}`);

        if (options.openingBalance !== undefined) {
            lines.push(`Opening Balance:,${options.openingBalance.toFixed(2)}`);
        }

        if (options.closingBalance !== undefined) {
            lines.push(`Closing Balance:,${options.closingBalance.toFixed(2)}`);
        }

        lines.push(''); // Empty line

        // Transaction headers
        lines.push('Date,Value Date,Description,Debit,Credit,Balance,Reference');

        // Transaction rows
        for (const tx of options.transactions) {
            const row = [
                tx.date,
                tx.valueDate,
                escapeCSV(tx.description),
                tx.debit ? tx.debit.toFixed(2) : '',
                tx.credit ? tx.credit.toFixed(2) : '',
                tx.balance ? tx.balance.toFixed(2) : '',
                escapeCSV(tx.reference),
            ];
            lines.push(row.join(','));
        }

        // Convert to buffer
        return Buffer.from(lines.join('\n'), 'utf-8');
    } catch (error) {
        console.error('[CSVGenerator] Failed to generate CSV statement:', error);
        throw new Error('Failed to generate CSV statement');
    }
}

/**
 * Escape CSV field (handle commas, quotes)
 */
function escapeCSV(field: string): string {
    if (!field) return '';

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }

    return field;
}
