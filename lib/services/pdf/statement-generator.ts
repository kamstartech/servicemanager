/**
 * Statement PDF Generator
 * 
 * Generates account statement PDFs with transaction history
 */

import PDFDocument from 'pdfkit';
import { T24StatementTransaction } from '../t24/statement';
import { encryptPDF } from './pdf-encryption';

export interface StatementPDFOptions {
    accountNumber: string;
    accountName: string;
    startDate: string;
    endDate: string;
    transactions: T24StatementTransaction[];
    password: string; // firstname + lastname + username
    openingBalance?: number;
    closingBalance?: number;
    currency: string;
}

export async function generateEncryptedStatementPDF(
    options: StatementPDFOptions
): Promise<Buffer> {
    try {
        // Generate PDF
        const pdfBuffer = await generateStatementPDF(options);

        // Encrypt with password
        const encryptedBuffer = await encryptPDF(pdfBuffer, options.password);

        return encryptedBuffer;
    } catch (error) {
        console.error('[StatementPDF] Failed to generate encrypted PDF:', error);
        throw new Error('Failed to generate statement PDF');
    }
}

/**
 * Generate unencrypted statement PDF
 */
async function generateStatementPDF(
    options: StatementPDFOptions
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Buffer[] = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Add content to PDF
            addHeader(doc, options);
            addAccountInfo(doc, options);
            addTransactionTable(doc, options);
            addFooter(doc, options);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add PDF header
 */
function addHeader(doc: PDFKit.PDFDocument, options: StatementPDFOptions) {
    doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('FDH BANK', { align: 'center' })
        .fontSize(16)
        .text('Account Statement', { align: 'center' })
        .moveDown(2);
}

/**
 * Add account information
 */
function addAccountInfo(doc: PDFKit.PDFDocument, options: StatementPDFOptions) {
    doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Account Holder: `, { continued: true })
        .font('Helvetica')
        .text(options.accountName)
        .font('Helvetica-Bold')
        .text(`Account Number: `, { continued: true })
        .font('Helvetica')
        .text(options.accountNumber)
        .font('Helvetica-Bold')
        .text(`Statement Period: `, { continued: true })
        .font('Helvetica')
        .text(`${options.startDate} to ${options.endDate}`)
        .moveDown();

    if (options.openingBalance !== undefined) {
        doc
            .font('Helvetica-Bold')
            .text(`Opening Balance: `, { continued: true })
            .font('Helvetica')
            .text(`${options.currency} ${options.openingBalance.toFixed(2)}`);
    }

    if (options.closingBalance !== undefined) {
        doc
            .font('Helvetica-Bold')
            .text(`Closing Balance: `, { continued: true })
            .font('Helvetica')
            .text(`${options.currency} ${options.closingBalance.toFixed(2)}`);
    }

    doc.moveDown(2);
}

/**
 * Add transaction table
 */
function addTransactionTable(doc: PDFKit.PDFDocument, options: StatementPDFOptions) {
    const tableTop = doc.y;
    const colWidths = {
        date: 80,
        description: 180,
        debit: 70,
        credit: 70,
        balance: 80,
    };

    // Table header
    doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Date', 50, tableTop, { width: colWidths.date })
        .text('Description', 130, tableTop, { width: colWidths.description })
        .text('Debit', 310, tableTop, { width: colWidths.debit, align: 'right' })
        .text('Credit', 380, tableTop, { width: colWidths.credit, align: 'right' })
        .text('Balance', 450, tableTop, { width: colWidths.balance, align: 'right' });

    // Draw header line
    doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(50, tableTop + 15)
        .lineTo(530, tableTop + 15)
        .stroke();

    let y = tableTop + 25;

    // Transaction rows
    doc.font('Helvetica').fontSize(8);

    for (const tx of options.transactions) {
        // Check if we need a new page
        if (y > 700) {
            doc.addPage();
            y = 50;
        }

        const date = tx.date || tx.valueDate;
        const description = truncate(tx.description, 40);
        const debit = tx.debit ? tx.debit.toFixed(2) : '';
        const credit = tx.credit ? tx.credit.toFixed(2) : '';
        const balance = tx.balance ? tx.balance.toFixed(2) : '';

        doc
            .text(date, 50, y, { width: colWidths.date })
            .text(description, 130, y, { width: colWidths.description })
            .text(debit, 310, y, { width: colWidths.debit, align: 'right' })
            .text(credit, 380, y, { width: colWidths.credit, align: 'right' })
            .text(balance, 450, y, { width: colWidths.balance, align: 'right' });

        y += 20;
    }

    // Draw bottom line
    doc
        .strokeColor('#000000')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(530, y)
        .stroke();

    doc.moveDown(3);
}

/**
 * Add PDF footer
 */
function addFooter(doc: PDFKit.PDFDocument, options: StatementPDFOptions) {
    const pageHeight = doc.page.height;

    doc
        .fontSize(8)
        .font('Helvetica')
        .text(
            `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
            50,
            pageHeight - 50,
            { align: 'center' }
        )
        .text(
            'This is a computer-generated document and does not require a signature.',
            50,
            pageHeight - 35,
            { align: 'center' }
        );
}

/**
 * Truncate text to specified length
 */
function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}
