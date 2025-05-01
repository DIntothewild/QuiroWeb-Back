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
  if (!booking) {
    logError("❌ No se recibió un objeto de reserva válido.");
    return;
  }

  const { customerName, terapiasType, dateTime, phoneNumber } = booking;

  if (!customerName || !terapiasType || !dateTime || !phoneNumber) {
    logError("❌ Faltan datos necesarios en la reserva:", booking);
    return;
  }

  const phone = phoneNumber.replace(/\D/g, "");
  const fullPhone = phone.startsWith("34") ? `+${phone}` : `+34${phone}`;

  if (!fullPhone || fullPhone.length < 10) {
    logWarning("Número de teléfono inválido para WhatsApp");
    return;
  }

  // Validación y extracción de fecha y hora
  const dateTimeParts = dateTime.split(" ");
  if (dateTimeParts.length !== 2) {
    logError("❌ El formato de dateTime es incorrecto:", dateTime);
    return;
  }

  const [date, time] = dateTimeParts;

  console.log("📞 Enviando WhatsApp con plantilla:", {
    to: fullPhone,
    customerName,
    terapiasType,
    date,
    time,
  });

  try {
    const res = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:${fullPhone}`,
      contentSid: "HX0c9f3a05634a57e2805db0f4ef8d1f2", // Tu plantilla aprobada
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

module.exports = {
  sendWhatsAppMessage,
};
