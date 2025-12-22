/**
 * Excel Statement Generator
 * 
 * Generates account statements in Excel (.xlsx) format
 */

import * as XLSX from 'xlsx-js-style';
import { T24StatementTransaction } from '../t24/statement';

export interface StatementExcelOptions {
    accountNumber: string;
    accountName: string;
    startDate: string;
    endDate: string;
    transactions: T24StatementTransaction[];
    openingBalance?: number;
    closingBalance?: number;
    currency: string;
}

export async function generateStatementExcel(
    options: StatementExcelOptions
): Promise<Buffer> {
    try {
        // Create header info
        const headerData = [
            ['FDH BANK'],
            ['Account Statement'],
            [],
            ['Account Holder:', options.accountName],
            ['Account Number:', options.accountNumber],
            ['Statement Period:', `${options.startDate} to ${options.endDate}`],
            ['Currency:', options.currency],
        ];

        if (options.openingBalance !== undefined) {
            headerData.push(['Opening Balance:', options.openingBalance.toFixed(2)]);
        }

        if (options.closingBalance !== undefined) {
            headerData.push(['Closing Balance:', options.closingBalance.toFixed(2)]);
        }

        headerData.push([]); // Empty row before transactions

        // Create transaction rows
        const transactionHeaders = [
            'Date',
            'Value Date',
            'Description',
            'Debit',
            'Credit',
            'Balance',
            'Reference',
        ];

        const transactionRows = options.transactions.map(tx => [
            tx.date,
            tx.valueDate,
            tx.description,
            tx.debit ? tx.debit.toFixed(2) : '',
            tx.credit ? tx.credit.toFixed(2) : '',
            tx.balance ? tx.balance.toFixed(2) : '',
            tx.reference,
        ]);

        // Combine all data
        const allData = [...headerData, transactionHeaders, ...transactionRows];

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(allData);

        // Set column widths
        ws['!cols'] = [
            { wch: 12 }, // Date
            { wch: 12 }, // Value Date
            { wch: 40 }, // Description
            { wch: 12 }, // Debit
            { wch: 12 }, // Credit
            { wch: 12 }, // Balance
            { wch: 20 }, // Reference
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Statement');

        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return Buffer.from(buffer);
    } catch (error) {
        console.error('[ExcelGenerator] Failed to generate Excel statement:', error);
        throw new Error('Failed to generate Excel statement');
    }
}
