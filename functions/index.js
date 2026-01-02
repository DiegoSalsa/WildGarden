const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

const REGION = process.env.FUNCTION_REGION || 'southamerica-east1';

function getConfig() {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'WildGarden <noreply@floreriawildgarden.cl>';
  const replyTo = process.env.MAIL_REPLY_TO || 'wildgardenccp@gmail.com';
  return { resendKey, from, replyTo };
}

function getResendClient() {
  const { resendKey } = getConfig();
  if (!resendKey) {
    throw new Error('Falta RESEND_API_KEY. Configúralo como Secret: firebase functions:secrets:set RESEND_API_KEY');
  }
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

exports.sendWelcomeEmail = onDocumentCreated(
    {
      region: REGION,
      document: 'users/{uid}',
      secrets: ['RESEND_API_KEY']
    },
    async (event) => {
      const snap = event.data;
      if (!snap) return;

      const uid = event.params.uid;
      const data = snap.data() || {};

      const email = String(data.email || '').trim();
      if (!email) return;

      const displayName = String(data.name || data.displayName || '').trim();

      // Evitar duplicados si ya se marcó como enviado
      const status = data?.emailStatus?.welcome?.status;
      if (status === 'sent') return;

      const resend = getResendClient();
      const { from, replyTo } = getConfig();

      const userRef = admin.firestore().collection('users').doc(uid);

      await userRef.set(
        {
          emailStatus: {
            welcome: {
              status: 'sending',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        },
        { merge: true }
      );

      try {
        const result = await resend.emails.send({
          from,
          to: email,
          replyTo,
          subject: 'Bienvenid@ a WildGarden',
          html: buildWelcomeEmailHtml({ name: displayName })
        });

        await userRef.set(
          {
            emailStatus: {
              welcome: {
                status: 'sent',
                messageId: result?.data?.id || null,
                sentAt: admin.firestore.FieldValue.serverTimestamp()
              }
            }
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Welcome email error:', err);
        await userRef.set(
          {
            emailStatus: {
              welcome: {
                status: 'error',
                error: String(err?.message || err),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }
            }
          },
          { merge: true }
        );
      }
    }
  );

exports.sendOrderConfirmationEmail = onDocumentCreated(
  {
    region: REGION,
    document: 'orders/{orderId}',
    secrets: ['RESEND_API_KEY']
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const orderId = event.params.orderId;
    const order = snap.data() || {};

    const customerEmail = String(order.customerEmail || '').trim();
    if (!customerEmail) return;

    // Evitar duplicados si el documento ya viene con estado seteado
    const existingStatus = order?.emailStatus?.confirmation?.status;
    if (existingStatus === 'sent') return;

    const resend = getResendClient();
    const { from, replyTo } = getConfig();

    const orderRef = snap.ref;

    // Marcar "sending" (no re-dispara porque esto es onCreate)
    await orderRef.set(
      {
        emailStatus: {
          confirmation: {
            status: 'sending',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        }
      },
      { merge: true }
    );

    try {
      const result = await resend.emails.send({
        from,
        to: customerEmail,
        replyTo,
        subject: `Confirmación de pedido #${orderId}`,
        html: buildOrderConfirmationEmailHtml({ orderId, order })
      });

      await orderRef.set(
        {
          emailStatus: {
            confirmation: {
              status: 'sent',
              messageId: result?.data?.id || null,
              sentAt: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Order confirmation email error:', err);
      await orderRef.set(
        {
          emailStatus: {
            confirmation: {
              status: 'error',
              error: String(err?.message || err),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
          }
        },
        { merge: true }
      );
    }
  }
);
