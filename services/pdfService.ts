import jsPDF from 'jspdf';
import { SaleItem, Customer } from '../types';

export const generateReceiptPDF = (
    cart: SaleItem[],
    customer: Customer | null,
    totals: { total: number; discount: number; surcharge: number },
    paymentMethod: string,
    sellerName: string
) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Thermal printer width
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;
    const lineHeight = 5;

    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('A.M Abacaxi', pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Venda de Polpas e Frutas', pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
    doc.text(`Data: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += lineHeight + 2;

    // Customer Info
    doc.text('--------------------------------', pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.text(`Cliente: ${customer?.name || 'Balcão'}`, 5, y);
    y += lineHeight;
    doc.text(`Vendedor: ${sellerName}`, 5, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.text('--------------------------------', pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    // Items Header
    doc.setFontSize(7);
    doc.text('Qtd', 5, y);
    doc.text('Item', 15, y);
    doc.text('Total', pageWidth - 5, y, { align: 'right' });
    y += lineHeight;

    // Items
    cart.forEach(item => {
        const itemName = item.productName.substring(0, 20);
        const itemTotal = (item.quantity * item.unitPrice) - (item.discount || 0) + (item.surcharge || 0);

        doc.text(`${item.quantity}`, 5, y);
        doc.text(`${itemName}`, 15, y);
        doc.text(`R$ ${itemTotal.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
        y += lineHeight;

        // Optional details logic
        if (item.discount > 0 || item.surcharge > 0) {
            doc.setFontSize(6);
            let details = '';
            if (item.discount > 0) details += `Desc: -${item.discount.toFixed(2)} `;
            if (item.surcharge > 0) details += `Fan: +${item.surcharge.toFixed(2)}`;
            doc.text(details, 15, y);
            doc.setFontSize(7);
            y += lineHeight;
        }
    });

    y += 2;
    doc.text('--------------------------------', pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    // Totals
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    if (totals.discount > 0) {
        doc.text(`Desconto Geral: R$ ${totals.discount.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
        y += lineHeight;
    }

    if (totals.surcharge > 0) {
        doc.text(`Acréscimo Geral: R$ ${totals.surcharge.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
        y += lineHeight;
    }

    doc.text(`TOTAL: R$ ${totals.total.toFixed(2)}`, pageWidth - 5, y, { align: 'right' });
    y += lineHeight;

    doc.setFontSize(8);
    doc.text(`Pagamento: ${paymentMethod}`, 5, y);
    y += lineHeight + 5;

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Obrigado pela preferência!', pageWidth / 2, y, { align: 'center' });

    // Save
    doc.save(`cupom_${new Date().getTime()}.pdf`);
};
