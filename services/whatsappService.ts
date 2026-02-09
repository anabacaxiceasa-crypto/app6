import { SaleItem, Customer } from '../types';

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
