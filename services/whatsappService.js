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
  if (!booking || typeof booking !== "object") {
    logError("❌ No se recibió un objeto de reserva válido.");
    return;
  }

  const { customerName, terapiasType, phoneNumber, dateTime, date, time } =
    booking;

  const fullDateTime = dateTime || (date && time ? `${date} ${time}` : null);

  if (!customerName || !terapiasType || !phoneNumber || !fullDateTime) {
    logError("❌ Faltan datos necesarios en la reserva:", booking);
    return;
  }

  const phone = phoneNumber.replace(/\D/g, "");
  const fullPhone = phone.startsWith("34") ? `+${phone}` : `+34${phone}`;

  console.log("📞 Enviando WhatsApp a:", {
    numero_original: phoneNumber,
    numero_limpio: phone,
    numero_completo: fullPhone,
  });

  const [fecha, hora] = fullDateTime.split(" ");
  if (!fecha || !hora) {
    logError("❌ El formato de dateTime es incorrecto:", fullDateTime);
    return;
  }

  try {
    const res = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:${fullPhone}`,
      contentSid: "HX0c9f3a05634a57e2805db0f4ef8d1f2", // Tu template ID
      contentVariables: JSON.stringify({
        1: customerName,
        2: terapiasType,
        3: fecha,
        4: hora,
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
