import jsPDF from 'jspdf';
import { SaleItem, Customer, Sale, CustomerPayment, Product } from '../types';

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

export const generateCashReportPDF = (sales: Sale[], startDate: string, endDate: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vendas (Caixa)', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Filter non-credit sales
    const cashSales = sales.filter(s => s.paymentMethod !== 'FIADO' && s.status !== 'CANCELLED');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 20, y);
    doc.text('Cliente', 50, y);
    doc.text('Forma', 130, y);
    doc.text('Valor', pageWidth - 20, y, { align: 'right' });
    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    let totalCash = 0;
    const totalsByMethod: Record<string, number> = {};

    cashSales.forEach(s => {
        if (y > 270) { doc.addPage(); y = 20; }

        doc.text(new Date(s.date).toLocaleDateString(), 20, y);
        doc.text(s.customerName.substring(0, 25), 50, y);
        doc.text(s.paymentMethod, 130, y);
        doc.text(`R$ ${s.totalAmount.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

        totalCash += s.totalAmount;
        totalsByMethod[s.paymentMethod] = (totalsByMethod[s.paymentMethod] || 0) + s.totalAmount;
        y += 8;
    });

    y += 5;
    doc.line(20, y, pageWidth - 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO POR FORMA DE PAGAMENTO:', 20, y);
    y += 10;

    doc.setFontSize(10);
    Object.entries(totalsByMethod).forEach(([method, total]) => {
        doc.text(`${method}: R$ ${total.toFixed(2)}`, 20, y);
        y += 6;
    });

    y += 5;
    doc.setFontSize(14);
    doc.text(`TOTAL GERAL: R$ ${totalCash.toFixed(2)}`, 20, y);

    doc.save(`Relatorio_Caixa_${startDate}_${endDate}.pdf`);
};



export const generateProductOutputReportPDF = (sales: Sale[], products: Product[], startDate: string, endDate: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Saída de Produtos', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Aggregate Product Sales
    const productStats: Record<string, { name: string, qtySold: number, currentStock: number, totalValue: number }> = {};

    sales.forEach(s => {
        if (s.status === 'CANCELLED') return;
        s.items.forEach(item => {
            if (!productStats[item.productId]) {
                const prod = products.find(p => p.id === item.productId);
                productStats[item.productId] = {
                    name: item.productName,
                    qtySold: 0,
                    currentStock: prod ? prod.stock : 0,
                    totalValue: 0
                };
            }
            productStats[item.productId].qtySold += item.quantity;
            productStats[item.productId].totalValue += (item.total || (item.quantity * item.unitPrice));
        });
    });

    // Add products with 0 sales but in stock (Optional, but "Saída" implies sales. Let's stick to sales or active products)
    // The user asked for "Saída de Produtos" report, so purely sales oriented. 
    // BUT "Estoque Atual" implies they want to compare.
    // Let's keep only products that had sales OR are in the list passed (if needed). 
    // Logic above only takes sold items. Let's iterate ALL products to show everything? 
    // "Relatório de Saída" usually lists what went out.
    // But "Estoque Atual" is useful context.
    // I will stick to "Sold Products" to keep it focused on "Saída".

    const sortedProducts = Object.values(productStats).sort((a, b) => b.qtySold - a.qtySold);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    // Columns
    doc.text('Produto', 15, y); // Adjusted
    doc.text('Qtd', 100, y, { align: 'right' });
    doc.text('Estoque', 130, y, { align: 'right' });
    doc.text('Total (R$)', 160, y, { align: 'right' });
    doc.text('Status', pageWidth - 15, y, { align: 'right' });

    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    doc.setFont('helvetica', 'normal');

    let grandTotalQty = 0;
    let grandTotalStock = 0; // Only for listed products
    let grandTotalValue = 0;

    sortedProducts.forEach(p => {
        if (y > 270) { doc.addPage(); y = 20; }

        doc.text(p.name.substring(0, 35), 15, y);
        doc.text(p.qtySold.toString(), 100, y, { align: 'right' });
        doc.text(p.currentStock.toString(), 130, y, { align: 'right' });
        doc.text(p.totalValue.toFixed(2), 160, y, { align: 'right' });

        let status = 'OK';
        if (p.currentStock <= 0) status = 'ESGOTADO';
        else if (p.currentStock < 10) status = 'BAIXO';

        doc.setTextColor(status === 'OK' ? 0 : 200, status === 'OK' ? 100 : 0, 0); // Green/Red
        doc.setFontSize(8);
        doc.text(status, pageWidth - 15, y, { align: 'right' });
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        grandTotalQty += p.qtySold;
        grandTotalStock += p.currentStock;
        grandTotalValue += p.totalValue;

        y += 8;
    });

    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    // Footer Totals
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAIS GERAIS:', 15, y);

    doc.setFontSize(10);
    doc.text(`${grandTotalQty}`, 100, y, { align: 'right' });
    doc.text(`${grandTotalStock}`, 130, y, { align: 'right' }); // Sum of stock of sold items
    doc.text(`R$ ${grandTotalValue.toFixed(2)}`, 160, y, { align: 'right' });

    doc.save(`Relatorio_Saida_Produtos_${startDate}_${endDate}.pdf`);
};
