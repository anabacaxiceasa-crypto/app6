import { SaleItem, Customer, Sale, CustomerPayment, Product } from '../types';

export const shareSaleOnWhatsApp = (
    cart: SaleItem[],
    customer: Customer | null,
    totals: { total: number; discount: number; surcharge: number },
    paymentMethod: string,
    sellerName: string
) => {
    if (!customer?.phone) {
        alert('Cliente não possui telefone cadastrado ou não foi selecionado.');
        return;
    }

    // Sanitize phone number (remove non-digits)
    let phone = customer.phone.replace(/\D/g, '');

    // Basic validation - ensure country code if missing (assuming BR +55)
    if (phone.length <= 11) {
        phone = `55${phone}`;
    }

    const date = new Date().toLocaleString();

    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Comprovante de Venda_\n\n`;
    message += `*Data:* ${date}\n`;
    message += `*Cliente:* ${customer.name}\n`;
    message += `*Vendedor:* ${sellerName}\n\n`;
    message += `*ITENS:*\n`;

    cart.forEach(item => {
        const totalItem = (item.quantity * item.unitPrice) - (item.discount || 0) + (item.surcharge || 0);
        message += `${item.quantity}x ${item.productName} - R$ ${totalItem.toFixed(2)}\n`;
    });

    message += `\n----------------\n`;
    if (totals.discount > 0) message += `Desconto: R$ ${totals.discount.toFixed(2)}\n`;
    if (totals.surcharge > 0) message += `Acréscimo: R$ ${totals.surcharge.toFixed(2)}\n`;
    message += `*TOTAL: R$ ${totals.total.toFixed(2)}*\n`;
    message += `*Forma de Pagto:* ${paymentMethod}\n\n`;
    message += `_Obrigado pela preferência!_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
};

export const shareGeneralCreditReportWhatsApp = (debtors: { id: string; name: string; total: number }[]) => {
    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Relatório Geral de Fiado_\n`;
    message += `Data: ${new Date().toLocaleDateString()}\n\n`;

    let grandTotal = 0;

    debtors.forEach(d => {
        message += `👤 ${d.name}: R$ ${d.total.toFixed(2)}\n`;
        grandTotal += d.total;
    });

    message += `\n----------------\n`;
    message += `*TOTAL GERAL: R$ ${grandTotal.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    // Using open implementation without specific number to let user choose contact
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};

export const shareIndividualCreditReportWhatsApp = (customer: Customer, sales: Sale[]) => {
    if (!customer.phone) {
        alert('Cliente não possui telefone cadastrado.');
        return;
    }

    let phone = customer.phone.replace(/\D/g, '');
    if (phone.length <= 11) phone = `55${phone}`;

    let totalDebt = 0;
    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Extrato de Conta - ${customer.name}_\n\n`;

    sales.forEach(s => {
        const date = new Date(s.date).toLocaleDateString();
        message += `📅 ${date} - R$ ${s.totalAmount.toFixed(2)}\n`;
        totalDebt += s.totalAmount;
    });

    message += `\n----------------\n`;
    message += `*TOTAL DEVEDOR: R$ ${totalDebt.toFixed(2)}*\n\n`;
    message += `_Favor entrar em contato para regularizar._`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
};

export const shareFinancialReportWhatsApp = (sales: Sale[], payments: CustomerPayment[], startDate: string, endDate: string) => {
    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Relatório Financeiro do Período_\n`;
    message += `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}\n\n`;

    let totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    let totalPayments = payments.reduce((acc, p) => acc + p.amount, 0);

    message += `📉 *VENDAS (FIADO):* R$ ${totalSales.toFixed(2)}\n`;
    message += `📈 *RECEBIMENTOS:* R$ ${totalPayments.toFixed(2)}\n`;

    message += `\n----------------\n`;
    message += `*SALDO DO PERÍODO: R$ ${(totalSales - totalPayments).toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};

export const shareCashReportWhatsApp = (sales: Sale[], startDate: string, endDate: string) => {
    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Relatório de Caixa (Vendas)_\n`;
    message += `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}\n\n`;

    const cashSales = sales.filter(s => s.paymentMethod !== 'FIADO' && s.status !== 'CANCELLED');
    const totalsByMethod: Record<string, number> = {};
    let totalCash = 0;

    cashSales.forEach(s => {
        totalCash += s.totalAmount;
        totalsByMethod[s.paymentMethod] = (totalsByMethod[s.paymentMethod] || 0) + s.totalAmount;
    });

    Object.entries(totalsByMethod).forEach(([method, total]) => {
        message += `💰 *${method}:* R$ ${total.toFixed(2)}\n`;
    });

    message += `\n----------------\n`;
    message += `*TOTAL GERAL: R$ ${totalCash.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};

export const shareProductOutputReportWhatsApp = (sales: Sale[], products: Product[], startDate: string, endDate: string) => {
    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Saída de Produtos (Top 10)_\n`;
    message += `📅 ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}\n\n`;

    const productStats: Record<string, { name: string, qtySold: number, currentStock: number }> = {};

    sales.forEach(s => {
        if (s.status === 'CANCELLED') return;
        s.items.forEach(item => {
            if (!productStats[item.productId]) {
                const prod = products.find(p => p.id === item.productId);
                productStats[item.productId] = {
                    name: item.productName,
                    qtySold: 0,
                    currentStock: prod ? prod.stock : 0
                };
            }
            productStats[item.productId].qtySold += item.quantity;
        });
    });

    const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.qtySold - a.qtySold)
        .slice(0, 10);

    sortedProducts.forEach((p, index) => {
        message += `${index + 1}. *${p.name}*\n`;
        message += `   Semana: ${p.qtySold} un | Estoque: ${p.currentStock}\n`;
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};
