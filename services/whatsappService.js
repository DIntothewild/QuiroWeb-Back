// services/whatsappService.js
const twilio = require("twilio");
const { logSuccess, logError, logWarning } = require("../services/logger");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = `whatsapp:${
  process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"
}`;
const client = twilio(accountSid, authToken);

// 📦 Función principal
async function sendWhatsAppMessage(booking, templateType = "confirmation") {
  const phone = booking.phoneNumber?.replace(/\D/g, "");
  const fullPhone = phone?.startsWith("34") ? `+${phone}` : `+34${phone}`;

  console.log("📞 Enviando WhatsApp a:", {
    numero_original: booking.phoneNumber,
    numero_limpio: phone,
    numero_completo: fullPhone,
  });

  if (!fullPhone || fullPhone.length < 10) {
    logWarning("Número de teléfono inválido para WhatsApp");
    return;
  }

  const message = getMessageTemplate(booking, templateType);

  try {
    const res = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:${fullPhone}`,
      contentSid: "HX0c9f3a05634a57e2805db0f4ef8d1f2", // ID de la plantilla
      contentVariables: JSON.stringify({
        1: customerName,
        2: terapiasType,
        3: date,
        4: time,
      }),
    });

    logSuccess(
      `📲 Mensaje WhatsApp (${templateType}) enviado a ${fullPhone} (SID: ${res.sid})`
    );
  } catch (error) {
    logError(
      `❌ Error enviando WhatsApp (${templateType}) a ${fullPhone}: ${error.message}`
    );
    throw error;
  }
}

// 🧾 Plantillas
function getMessageTemplate(booking, type) {
  const { customerName, terapiasType, date, time } = booking;
  const [y, m, d] = date.split("-");
  const fechaES = `${d}/${m}/${y}`;

  switch (type) {
    case "reminder":
      return `¡Hola ${customerName}! 👋

Te recordamos que mañana tienes una cita de *${terapiasType}* ⏰

📅 Fecha: ${fechaES}
⏰ Hora: ${time}

¡Te esperamos en Wellness Flow! 🌿`;
    case "cancellation":
      return `Hola ${customerName},

Tu cita de *${terapiasType}* para el día ${fechaES} a las ${time} ha sido *cancelada*.

Si deseas reprogramar, puedes hacerlo desde nuestra web o contactándonos directamente.

Gracias por tu comprensión.`;
    case "confirmation":
    default:
      return `¡Hola ${customerName}! 👋

Tu reserva de *${terapiasType}* ha sido confirmada ✅

📅 Fecha: ${fechaES}
⏰ Hora: ${time}

Te esperamos en Wellness Flow 🌿

Si necesitas cancelar o cambiar tu cita, por favor contáctanos con al menos 24 horas de antelación.

¡Gracias por confiar en nosotros!`;
  }
}

module.exports = {
  sendWhatsAppMessage,
};
