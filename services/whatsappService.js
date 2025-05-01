// services/whatsappService.js
const twilio = require("twilio");
const { logSuccess, logError, logWarning } = require("../services/logger");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = `whatsapp:${
  process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"
}`;

// Verificar que las credenciales estén configuradas
if (!accountSid || !authToken) {
  logWarning("⚠️ Credenciales de Twilio no configuradas correctamente");
}

const client = twilio(accountSid, authToken);

// 📦 Función principal
async function sendWhatsAppMessage(booking, templateType = "confirmation") {
  if (!booking || typeof booking !== "object") {
    logError("❌ No se recibió un objeto de reserva válido.");
    return;
  }

  const { customerName, terapiasType, phoneNumber, dateTime, date, time } =
    booking;

  // Comprobar que todos los campos necesarios existen
  if (!customerName || !terapiasType || !phoneNumber) {
    logError("❌ Faltan datos necesarios en la reserva:", booking);
    return;
  }

  // Determinar la fecha y hora correctamente
  const fullDateTime = dateTime || (date && time ? `${date} ${time}` : null);
  if (!fullDateTime) {
    logError("❌ No se pudo determinar la fecha y hora de la reserva");
    return;
  }

  // Limpiar y formatear el número de teléfono correctamente
  let cleanPhone = phoneNumber.replace(/\D/g, "");
  // Asegurar que el número comienza con el código de país
  const fullPhone = cleanPhone.startsWith("34")
    ? cleanPhone
    : `34${cleanPhone}`;

  console.log("📞 Enviando WhatsApp a:", {
    numero_original: phoneNumber,
    numero_limpio: cleanPhone,
    numero_completo: `+${fullPhone}`,
  });

  // Extraer fecha y hora
  const [fecha, hora] = fullDateTime.split(" ");
  if (!fecha || !hora) {
    logError("❌ El formato de dateTime es incorrecto:", fullDateTime);
    return;
  }

  try {
    // Solución temporal: Envía un mensaje de texto simple mientras la plantilla se aprueba
    // Esto utilizará el método body en lugar de contentSid y contentVariables
    const messageText = `¡Hola ${customerName}! 👋\n\nTu reserva de *${terapiasType}* ha sido confirmada ✅\n\n📅 Fecha: ${fecha}\n⏰ Hora: ${hora}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Gracias por confiar en Wellness Flow 🌿`;

    const res = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:+${fullPhone}`,
      body: messageText,
    });

    logSuccess(
      `📲 Mensaje WhatsApp (${templateType}) enviado a +${fullPhone} (SID: ${res.sid})`
    );

    return res.sid;
  } catch (error) {
    logError(
      `❌ Error enviando WhatsApp (${templateType}) a +${fullPhone}: ${error.message}`
    );

    // Registrar más detalles sobre el error
    if (error.code) {
      logError(`Código de error Twilio: ${error.code}`);
    }
    if (error.moreInfo) {
      logError(`Más información: ${error.moreInfo}`);
    }

    // Implementar solución alternativa: enviar sin contentSid como fallback
    try {
      logWarning("⚠️ Intentando enviar mensaje usando método alternativo...");

      // Crear mensaje de texto simple como respaldo
      const fallbackMessage = `¡Hola ${customerName}! Tu reserva de ${terapiasType} para el ${fecha} a las ${hora} ha sido confirmada. Gracias por confiar en Wellness Flow.`;

      const fallbackRes = await client.messages.create({
        from: twilioPhoneNumber,
        to: `whatsapp:+${fullPhone}`,
        body: fallbackMessage,
      });

      logSuccess(
        `📲 Mensaje WhatsApp (fallback) enviado a +${fullPhone} (SID: ${fallbackRes.sid})`
      );
      return fallbackRes.sid;
    } catch (fallbackError) {
      logError(
        `❌ Error enviando WhatsApp (fallback) a +${fullPhone}: ${fallbackError.message}`
      );
      throw error; // Lanzar el error original
    }
  }
}

// Función adicional para usar cuando se apruebe la plantilla
async function sendWhatsAppWithTemplate(
  booking,
  templateType = "confirmation"
) {
  if (!booking || typeof booking !== "object") {
    logError("❌ No se recibió un objeto de reserva válido.");
    return;
  }

  const { customerName, terapiasType, phoneNumber, dateTime, date, time } =
    booking;

  // Comprobar todos los campos necesarios
  if (!customerName || !terapiasType || !phoneNumber) {
    logError("❌ Faltan datos necesarios en la reserva:", booking);
    return;
  }

  const fullDateTime = dateTime || (date && time ? `${date} ${time}` : null);
  if (!fullDateTime) {
    logError("❌ No se pudo determinar la fecha y hora de la reserva");
    return;
  }

  let cleanPhone = phoneNumber.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("34")
    ? cleanPhone
    : `34${cleanPhone}`;

  // Extraer fecha y hora
  const [fecha, hora] = fullDateTime.split(" ");
  if (!fecha || !hora) {
    logError("❌ El formato de dateTime es incorrecto:", fullDateTime);
    return;
  }

  try {
    // Usar la plantilla una vez aprobada
    const res = await client.messages.create({
      from: twilioPhoneNumber,
      to: `whatsapp:+${fullPhone}`,
      contentSid:
        process.env.TWILIO_CONTENT_SID || "HX0c9f3a05634a57e2805db0f4ef8d1f2",
      contentVariables: JSON.stringify({
        1: customerName,
        2: terapiasType,
        3: fecha,
        4: hora,
      }),
    });

    logSuccess(
      `📲 Mensaje WhatsApp con plantilla (${templateType}) enviado a +${fullPhone} (SID: ${res.sid})`
    );

    return res.sid;
  } catch (error) {
    logError(
      `❌ Error enviando WhatsApp con plantilla (${templateType}) a +${fullPhone}: ${error.message}`
    );
    throw error;
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppWithTemplate,
};
