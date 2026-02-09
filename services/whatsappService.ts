import { SaleItem, Customer, Sale } from '../types';

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

export const shareDateRangeCreditReportWhatsApp = (sales: Sale[], startDate: string, endDate: string) => {
    let message = `*A.M ABACAXI* 🍍\n`;
    message += `_Relatório de Vendas por Período_\n`;
    message += `📅 ${new Date(startDate).toLocaleDateString()} até ${new Date(endDate).toLocaleDateString()}\n\n`;

    let totalPeriod = 0;

    sales.forEach(s => {
        message += `🔹 ${new Date(s.date).toLocaleDateString()} - ${s.customerName}: R$ ${s.totalAmount.toFixed(2)}\n`;
        totalPeriod += s.totalAmount;
    });

    message += `\n----------------\n`;
    message += `*TOTAL NO PERÍODO: R$ ${totalPeriod.toFixed(2)}*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};
