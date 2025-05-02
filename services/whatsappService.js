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

      // MÉTODO CORREGIDO - Usando definición robusta de variables
      try {
        logInfo("🔄 Intento principal con formato correcto");

        // Crear objeto con propiedades explícitas (resistente a problemas de comillas)
        const variables = {};
        variables["1"] = safeCustomerName;
        variables["2"] = safeTerapiasType;
        variables["3"] = safeDate;
        variables["4"] = safeTime;

        // Log para depuración
        logInfo(`📤 Enviando variables: ${JSON.stringify(variables)}`);

        const message = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          contentSid: contentSid,
          contentVariables: variables,
        });

        logSuccess(`📲 Mensaje con plantilla enviado (SID: ${message.sid})`);
        return { success: true, messageSid: message.sid };
      } catch (error1) {
        // Log detallado del error para mejor diagnóstico
        logWarning(`⚠️ Intento principal falló: ${error1.message}`);
        logInfo(`📋 Detalles del error: ${JSON.stringify(error1, null, 2)}`);

        // Intento alternativo - usando bracket notation
        try {
          logInfo("🔄 Intento alternativo con bracket notation");
          const message = await client.messages.create({
            from: twilioPhoneNumber,
            to: formattedPhone,
            contentSid: contentSid,
            contentVariables: {
              ["1"]: safeCustomerName,
              ["2"]: safeTerapiasType,
              ["3"]: safeDate,
              ["4"]: safeTime,
            },
          });

          logSuccess(`📲 Mensaje con plantilla enviado (SID: ${message.sid})`);
          return { success: true, messageSid: message.sid };
        } catch (error2) {
          logWarning(`⚠️ Intento alternativo falló: ${error2.message}`);

          // Intento con formato de fecha alternativo
          try {
            logInfo("🔄 Intento con formato de fecha diferente");
            const formattedDate = new Date(safeDate).toLocaleDateString(
              "es-ES",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            );

            const dateVariables = {};
            dateVariables["1"] = safeCustomerName;
            dateVariables["2"] = safeTerapiasType;
            dateVariables["3"] = formattedDate;
            dateVariables["4"] = safeTime;

            const message = await client.messages.create({
              from: twilioPhoneNumber,
              to: formattedPhone,
              contentSid: contentSid,
              contentVariables: dateVariables,
            });

            logSuccess(
              `📲 Mensaje con plantilla enviado (SID: ${message.sid})`
            );
            return { success: true, messageSid: message.sid };
          } catch (error3) {
            logWarning(
              `⚠️ Intento con fecha alternativa falló: ${error3.message}`
            );
            logError(
              "❌ Todos los intentos con plantilla fallaron, procediendo con mensaje libre"
            );
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
    return { success: true, messageSid: fallbackRes.sid, usedFallback: true };
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
