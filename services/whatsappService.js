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

  const useTemplateFirst = forceTemplate || !recentInteraction;

  try {
    if (useTemplateFirst) {
      // ✅ Verificación de variables
      logInfo("📋 Variables para plantilla:");
      console.log({
        customerName,
        terapiasType,
        date,
        time,
      });

      if (!customerName || !terapiasType || !date || !time) {
        logError(
          "❌ Uno o más valores para la plantilla están vacíos o undefined"
        );
        return { success: false, error: "Datos incompletos para plantilla" };
      }

      try {
        const message = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          contentSid: contentSid,
          contentVariables: JSON.stringify({
            1: customerName,
            2: terapiasType,
            3: date,
            4: time,
          }),
        });

        logSuccess(`📲 Mensaje con plantilla enviado (SID: ${message.sid})`);
        return { success: true, messageSid: message.sid };
      } catch (templateError) {
        logWarning(`⚠️ Error con plantilla: ${templateError.message}`);

        if (!recentInteraction) {
          logWarning(
            "⚠️ Sin confirmación de interacción reciente. Puede fallar el siguiente intento."
          );
        }

        const body = `¡Hola ${customerName}! 👋\n\nTu reserva de *${terapiasType}* ha sido confirmada ✅\n\n📅 Fecha: ${date}\n⏰ Hora: ${time}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Gracias por confiar en Wellness Flow 🌿`;

        const message = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          body: body,
        });

        logSuccess(
          `📲 Mensaje libre enviado como fallback (SID: ${message.sid})`
        );
        return { success: true, messageSid: message.sid };
      }
    } else {
      logInfo(
        `🔄 Usando mensaje libre para +${fullPhone} (interacción reciente)`
      );

      try {
        const body = `¡Hola ${customerName}! 👋\n\nTu reserva de *${terapiasType}* ha sido confirmada ✅\n\n📅 Fecha: ${date}\n⏰ Hora: ${time}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Gracias por confiar en Wellness Flow 🌿`;

        const message = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          body: body,
        });

        logSuccess(`📲 Mensaje libre enviado (SID: ${message.sid})`);
        return { success: true, messageSid: message.sid };
      } catch (directError) {
        if (
          directError.code === 63016 ||
          directError.message.includes("outside the allowed window")
        ) {
          logWarning("⚠️ Fuera de ventana 24h. Reintentando con plantilla...");

          return await sendWhatsAppMessage({ ...params, forceTemplate: true });
        } else {
          logError(`❌ Error en mensaje libre: ${directError.message}`);
          return { success: false, error: directError.message };
        }
      }
    }
  } catch (finalError) {
    logError(
      `❌ Error final enviando WhatsApp a +${fullPhone}: ${finalError.message}`
    );
    return { success: false, error: finalError.message };
  }
}

// SIMULACIÓN DE DETECCIÓN DE VENTANA DE 24h
async function checkIfWithin24hWindow(phoneNumber) {
  // Por ahora, siempre asumimos que está fuera de la ventana
  return false;
}

module.exports = {
  sendWhatsAppMessage,
};
