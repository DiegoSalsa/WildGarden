const { Resend } = require('resend');

function getMailConfig() {
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM || 'WildGarden <noreply@floreriawildgarden.cl>';
    const replyTo = process.env.MAIL_REPLY_TO || 'wildgardenccp@gmail.com';

    if (!resendKey) {
        throw new Error('Falta RESEND_API_KEY');
    }

    return { resendKey, from, replyTo };
}

function getResendClient() {
    const { resendKey } = getMailConfig();
    return new Resend(resendKey);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCLP(amount) {
    const n = Number(amount) || 0;
    try {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            maximumFractionDigits: 0
        }).format(n);
    } catch {
        return `$${Math.round(n).toLocaleString('es-CL')}`;
    }
}

function buildWelcomeEmailHtml({ name }) {
    const safeName = escapeHtml(name || '');
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #253020;">
      <h2 style="margin: 0 0 12px; font-weight: 600;">¡Bienvenid@${safeName ? `, ${safeName}` : ''} a WildGarden!</h2>
      <p style="margin: 0 0 12px;">Gracias por registrarte. Ya puedes revisar nuestros productos y hacer tu pedido cuando quieras.</p>
      <p style="margin: 0 0 12px;">
        <a href="https://www.floreriawildgarden.cl/pages/productos.html" style="color: #4C6443;">Ver productos</a>
      </p>
      <p style="margin: 18px 0 0; font-size: 12px; color: #4C6443;">Este correo fue enviado automáticamente, por favor no respondas a este mensaje.</p>
    </div>
  `;
}

function buildOrderConfirmationEmailHtml({ orderId, order }) {
    const name = escapeHtml(order.customerName || '');
    const total = formatCLP(order.amount);
    const needsShipping = !!order.needsShipping;

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsRows = items
        .map((it) => {
            const itemName = escapeHtml(it?.name || 'Producto');
            const qty = Number(it?.quantity) || 0;
            const price = formatCLP(it?.price);
            return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${itemName}</td>
          <td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e5e5;">${qty}</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e5e5;">${price}</td>
        </tr>
      `;
        })
        .join('');

    const shippingBlock = needsShipping
        ? `
      <p style="margin: 12px 0 0;"><strong>Envío:</strong> Sí</p>
      <p style="margin: 6px 0 0;"><strong>Dirección:</strong> ${escapeHtml(order.customerAddress || '')}</p>
      <p style="margin: 6px 0 0;"><strong>Ciudad:</strong> ${escapeHtml(order.customerCity || '')}</p>
      ${order.deliveryDate ? `<p style="margin: 6px 0 0;"><strong>Fecha:</strong> ${escapeHtml(order.deliveryDate)}</p>` : ''}
      ${order.deliveryTime ? `<p style="margin: 6px 0 0;"><strong>Hora:</strong> ${escapeHtml(order.deliveryTime)}</p>` : ''}
      ${order.deliveryNotes ? `<p style="margin: 6px 0 0;"><strong>Notas:</strong> ${escapeHtml(order.deliveryNotes)}</p>` : ''}
    `
        : `
      <p style="margin: 12px 0 0;"><strong>Envío:</strong> No</p>
    `;

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #253020;">
      <h2 style="margin: 0 0 10px; font-weight: 600;">Confirmación de pedido</h2>
      <p style="margin: 0 0 10px;">Hola${name ? `, ${name}` : ''}. Recibimos tu pedido.</p>
      <p style="margin: 0 0 12px;"><strong>N° Pedido:</strong> ${escapeHtml(orderId)}</p>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #253020;">Producto</th>
            <th style="text-align: center; padding: 8px; border-bottom: 2px solid #253020;">Cant.</th>
            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #253020;">Precio</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || '<tr><td colspan="3" style="padding: 8px;">(Sin items)</td></tr>'}
        </tbody>
      </table>

      <p style="margin: 0;"><strong>Total:</strong> ${escapeHtml(total)}</p>
      ${shippingBlock}

      <p style="margin: 18px 0 0; font-size: 12px; color: #4C6443;">Si tienes dudas, responde este correo y te atenderemos.</p>
    </div>
  `;
}

async function sendWelcomeEmail({ email, name }) {
    const to = String(email || '').trim();
    if (!to) return null;

    const resend = getResendClient();
    const { from, replyTo } = getMailConfig();

    return resend.emails.send({
        from,
        to,
        replyTo,
        subject: 'Bienvenid@ a WildGarden',
        html: buildWelcomeEmailHtml({ name: name || '' })
    });
}

async function sendOrderConfirmationEmail({ orderId, order }) {
    const to = String(order?.customerEmail || '').trim();
    if (!to) return null;

    const resend = getResendClient();
    const { from, replyTo } = getMailConfig();

    return resend.emails.send({
        from,
        to,
        replyTo,
        subject: `Confirmación de pedido #${orderId}`,
        html: buildOrderConfirmationEmailHtml({ orderId, order })
    });
}

module.exports = {
    sendWelcomeEmail,
    sendOrderConfirmationEmail
};
