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
  const { customerName, terapiasType, dateTime } = booking;

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

  // Separar fecha y hora
  const [date, time] = dateTime.split(" ");

  try {
    const res = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:${fullPhone}`,
      contentSid: "HX0c9f3a05634a57e2805db0f4ef8d1f2", // tu template ID
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
