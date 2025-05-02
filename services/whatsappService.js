// services/whatsappService.js
const twilio = require("twilio");
const {
  logSuccess,
  logError,
  logWarning,
  logInfo,
} = require("../services/logger");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
const contentSid = process.env.TWILIO_CONTENT_SID;

const client = twilio(accountSid, authToken);

// ENVÍA MENSAJE DE WHATSAPP
async function sendWhatsAppMessage(params) {
  const {
    customerName,
    terapiasType,
    phoneNumber,
    date,
    time,
    forceTemplate = false,
    recentInteraction = false,
  } = params;

  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("34")
    ? cleanPhone
    : `34${cleanPhone}`;
  const formattedPhone = `whatsapp:+${fullPhone}`;

  // Formatea las variables para evitar errores
  const safeCustomerName = (customerName || "").trim().substring(0, 50);
  const safeTerapiasType = (terapiasType || "").trim().substring(0, 30);
  const safeDate = (date || "").trim();
  const safeTime = (time || "").trim();

  const useTemplateFirst = forceTemplate || !recentInteraction;

  try {
    if (useTemplateFirst) {
      logInfo(`🔑 Usando contentSid: ${contentSid}`);

      if (!contentSid) {
        logError("❌ ContentSid no definido en variables de entorno");
        return { success: false, error: "ContentSid no configurado" };
      }

      // Verificación de datos
      logInfo("📋 Variables para plantilla:");
      console.log({
        customerName: safeCustomerName,
        terapiasType: safeTerapiasType,
        date: safeDate,
        time: safeTime,
      });

      if (!safeCustomerName || !safeTerapiasType || !safeDate || !safeTime) {
        logError("❌ Uno o más valores para la plantilla están vacíos");
        return { success: false, error: "Datos incompletos para plantilla" };
      }

      // Intento 1 - JSON.stringify
      try {
        logInfo("🔄 Intento #1: Con JSON.stringify");
        const message = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          contentSid: contentSid,
          contentVariables: JSON.stringify({
            1: safeCustomerName,
            2: safeTerapiasType,
            3: safeDate,
            4: safeTime,
          }),
        });

        logSuccess(`📲 Mensaje con plantilla enviado (SID: ${message.sid})`);
        return { success: true, messageSid: message.sid };
      } catch (error1) {
        logWarning(`⚠️ Intento #1 falló: ${error1.message}`);

        // Intento 2 - sin stringify
        try {
          logInfo("🔄 Intento #2: Sin JSON.stringify");
          const message = await client.messages.create({
            from: twilioPhoneNumber,
            to: formattedPhone,
            contentSid: contentSid,
            contentVariables: {
              1: safeCustomerName,
              2: safeTerapiasType,
              3: safeDate,
              4: safeTime,
            },
          });

          logSuccess(`📲 Mensaje con plantilla enviado (SID: ${message.sid})`);
          return { success: true, messageSid: message.sid };
        } catch (error2) {
          logWarning(`⚠️ Intento #2 falló: ${error2.message}`);

          // Intento 3 - formato alternativo de fecha
          try {
            logInfo("🔄 Intento #3: Con formato de fecha diferente");
            const formattedDate = new Date(safeDate).toLocaleDateString(
              "es-ES",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            );

            const message = await client.messages.create({
              from: twilioPhoneNumber,
              to: formattedPhone,
              contentSid: contentSid,
              contentVariables: JSON.stringify({
                1: safeCustomerName,
                2: safeTerapiasType,
                3: formattedDate,
                4: safeTime,
              }),
            });

            logSuccess(
              `📲 Mensaje con plantilla enviado (SID: ${message.sid})`
            );
            return { success: true, messageSid: message.sid };
          } catch (error3) {
            logWarning(`⚠️ Intento #3 falló: ${error3.message}`);
            throw new Error("Todos los intentos con plantilla fallaron");
          }
        }
      }
    }

    // MENSAJE LIBRE (fallback o si no hay plantilla)
    logInfo(`📩 Enviando mensaje libre para +${fullPhone}`);
    const fallbackMessage = `¡Hola ${safeCustomerName}! 👋\n\nTu reserva de *${safeTerapiasType}* ha sido confirmada ✅\n\n📅 Fecha: ${safeDate}\n⏰ Hora: ${safeTime}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Gracias por confiar en Wellness Flow 🌿`;

    const fallbackRes = await client.messages.create({
      from: twilioPhoneNumber,
      to: formattedPhone,
      body: fallbackMessage,
    });

    logSuccess(
      `📲 Mensaje libre enviado como fallback (SID: ${fallbackRes.sid})`
    );
    return { success: true, messageSid: fallbackRes.sid };
  } catch (finalError) {
    logError(
      `❌ Error final enviando WhatsApp a +${fullPhone}: ${finalError.message}`
    );
    return { success: false, error: finalError.message };
  }
}

// SIMULACIÓN de verificación de ventana de 24h
async function checkIfWithin24hWindow(phoneNumber) {
  return false; // En producción se consultaría una base de datos
}

module.exports = {
  sendWhatsAppMessage,
  checkIfWithin24hWindow,
};
