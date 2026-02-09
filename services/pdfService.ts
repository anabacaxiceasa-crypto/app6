import jsPDF from 'jspdf';
import { SaleItem, Customer, Sale, CustomerPayment } from '../types';

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

export const generateGeneralCreditReportPDF = (debtors: { id: string; name: string; total: number }[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Geral de Fiado', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, y);
    doc.text('Total Devedor', pageWidth - 20, y, { align: 'right' });
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let grandTotal = 0;

    debtors.forEach(d => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.text(d.name.substring(0, 40), 20, y);
        doc.text(`R$ ${d.total.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
        y += 8;
        grandTotal += d.total;
    });

    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL GERAL:', 20, y);
    doc.text(`R$ ${grandTotal.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

    doc.save('Relatorio_Geral_Fiado.pdf');
};

export const generateIndividualCreditReportPDF = (customer: Customer, sales: Sale[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Extrato de Cliente - Fiado', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.text(`Cliente: ${customer.name}`, 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 20, y);
    y += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 20, y);
    doc.text('Items', 60, y);
    doc.text('Valor', pageWidth - 20, y, { align: 'right' });
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    let totalDebt = 0;

    sales.forEach(s => {
        const date = new Date(s.date).toLocaleDateString();
        const itemsSummary = s.items.map(i => `${i.quantity}x ${i.productName}`).join(', ').substring(0, 50) + (s.items.length > 3 ? '...' : '');

        doc.text(date, 20, y);
        doc.text(itemsSummary, 60, y);
        doc.text(`R$ ${s.totalAmount.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

        totalDebt += s.totalAmount;
        y += 8;
    });

    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL DEVEDOR:', 20, y);
    doc.text(`R$ ${totalDebt.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });


    doc.save(`Extrato_${customer.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateFinancialReportPDF = (sales: Sale[], payments: CustomerPayment[], startDate: string, endDate: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Financeiro do Período', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Sales Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VENDAS (FIADO)', 20, y);
    y += 7;

    doc.setFontSize(10);
    doc.text('Data', 20, y);
    doc.text('Cliente', 50, y);
    doc.text('Valor', pageWidth - 20, y, { align: 'right' });
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    let totalSales = 0;

    sales.forEach(s => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(new Date(s.date).toLocaleDateString(), 20, y);
        doc.text(s.customerName.substring(0, 30), 50, y);
        doc.text(`R$ ${s.totalAmount.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
        totalSales += s.totalAmount;
        y += 6;
    });

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Vendas: R$ ${totalSales.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
    y += 15;

    // Payments Section
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text('RECEBIMENTOS', 20, y);
    y += 7;

    doc.setFontSize(10);
    doc.text('Data', 20, y);
    doc.text('Cliente', 50, y);
    doc.text('Forma', 150, y); // Adjusted X for 'Forma' to avoid overlap
    doc.text('Valor', pageWidth - 20, y, { align: 'right' });
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    let totalPayments = 0;

    payments.forEach(p => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(new Date(p.date).toLocaleDateString(), 20, y);
        doc.text(p.customerName.substring(0, 30), 50, y);
        doc.text(p.method, 150, y);
        doc.text(`R$ ${p.amount.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
        totalPayments += p.amount;
        y += 6;
    });

    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DO PERÍODO', 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Vendido (Fiado): R$ ${totalSales.toFixed(2)}`, 20, y);
    y += 7;
    doc.text(`Total Recebido: R$ ${totalPayments.toFixed(2)}`, 20, y);
    y += 10;

    const balance = totalSales - totalPayments;
    doc.setTextColor(balance > 0 ? 200 : 0, balance > 0 ? 0 : 150, 0); // Red if positive (debt increased), Greenish if negative (paid more) logic depends on perspective. 
    // Let's keep it simple: Balance = Movement. 
    doc.text(`Saldo do Período: R$ ${balance.toFixed(2)}`, 20, y);

    doc.save(`Relatorio_Financeiro_${startDate}_${endDate}.pdf`);
};
