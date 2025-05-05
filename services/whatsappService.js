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
const fallbackSid = process.env.TWILIO_FALLBACK_TEMPLATE_SID;

const client = twilio(accountSid, authToken);

// 🔍 Función de inspección profunda para debug
function deepInspect(obj, name = "") {
  logInfo(`📋 Inspección profunda de ${name || "objeto"}:`);
  try {
    const str = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    console.log(str);

    if (typeof obj === "object" && obj !== null) {
      Object.keys(obj).forEach((key) => {
        console.log(`${key}: ${typeof obj[key]} - ${obj[key]}`);
      });
    }
  } catch (e) {
    console.log(`[Error inspeccionando]: ${e.message}`);
  }
}

async function sendWhatsAppMessage(params) {
  const {
    customerName,
    terapiasType,
    phoneNumber,
    date,
    time,
    forceTemplate = false,
    recentInteraction = false,
    useMinimalTemplateOnly = false,
  } = params;

  if (!phoneNumber) {
    logError("❌ Número de teléfono no proporcionado");
    return { success: false, error: "Número de teléfono requerido" };
  }

  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("34")
    ? cleanPhone
    : `34${cleanPhone}`;
  const formattedPhone = `whatsapp:+${fullPhone}`;

  const safeCustomerName = (customerName || "").trim().substring(0, 50);
  const safeTerapiasType = (terapiasType || "").trim().substring(0, 30);
  let safeDate = "";
  try {
    if (date) {
      const dateObj = new Date(date);
      safeDate = dateObj.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  } catch (e) {
    safeDate = date || "";
    logWarning(`⚠️ Error al formatear fecha: ${e.message}`);
  }
  const safeTime = (time || "").trim();

  logInfo(`📤 Intentando enviar WhatsApp a +${fullPhone}`);

  try {
    if (!useMinimalTemplateOnly) {
      if (contentSid) {
        logInfo(
          `🔑 Usando plantilla principal (ContentSID: ${contentSid.substring(
            0,
            10
          )}...)`
        );
        logInfo("📋 Variables para plantilla:");
        console.log({
          customerName: safeCustomerName,
          terapiasType: safeTerapiasType,
          date: safeDate,
          time: safeTime,
        });

        const contentVars = {
          1: String(safeCustomerName),
          2: String(safeTerapiasType),
          3: String(safeDate),
          4: String(safeTime),
        };

        deepInspect(contentVars, "contentVariables");

        try {
          const message = await client.messages.create({
            from: twilioPhoneNumber,
            to: formattedPhone,
            contentSid: contentSid,
            contentVariables: contentVars,
          });

          logSuccess(
            `✅ Mensaje con plantilla principal enviado: ${message.sid}`
          );
          return { success: true, messageSid: message.sid };
        } catch (primaryError) {
          logWarning(
            `⚠️ Error con plantilla principal: ${primaryError.message}`
          );

          if (primaryError.response && primaryError.response.data) {
            deepInspect(primaryError.response.data, "Twilio error data");
          }

          if (primaryError.config && primaryError.config.data) {
            deepInspect(primaryError.config.data, "Payload enviado");
          }

          if (primaryError.code) {
            logInfo(
              `📋 Código de error: ${primaryError.code}, Estado: ${primaryError.status}`
            );
          }
        }
      }
    } else {
      logInfo(
        "⏭️ Saltando plantilla principal por configuración useMinimalTemplateOnly=true"
      );
    }

    // Fallback a plantilla básica
    if (fallbackSid) {
      logInfo(
        `🔄 Intentando con plantilla básica (SID: ${fallbackSid.substring(
          0,
          10
        )}...)`
      );
      try {
        const fallbackMessage = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          contentSid: fallbackSid,
        });

        logSuccess(
          `✅ Mensaje con plantilla básica enviado: ${fallbackMessage.sid}`
        );
        return {
          success: true,
          messageSid: fallbackMessage.sid,
          usedFallbackTemplate: true,
        };
      } catch (fallbackError) {
        logWarning(`⚠️ Error con plantilla básica: ${fallbackError.message}`);
        if (fallbackError.response && fallbackError.response.data) {
          deepInspect(fallbackError.response.data, "Twilio fallback error");
        }
      }
    }

    // Último recurso: mensaje libre (solo si hay interacción reciente)
    if (recentInteraction) {
      try {
        logInfo(`🔄 Intentando enviar mensaje simple como último recurso`);

        const simpleBody = `¡Hola ${safeCustomerName}! Tu reserva de ${safeTerapiasType} para el ${safeDate} a las ${safeTime} ha sido confirmada. Gracias por confiar en Wellness Flow.`;

        const simpleMessage = await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          body: simpleBody,
        });

        logSuccess(`✅ Mensaje simple enviado: ${simpleMessage.sid}`);
        return {
          success: true,
          messageSid: simpleMessage.sid,
          usedSimpleMessage: true,
        };
      } catch (finalError) {
        logError(`❌ También falló el mensaje simple: ${finalError.message}`);
      }
    } else {
      logWarning(
        "⚠️ No se pudo enviar mensaje simple: usuario fuera de la ventana de 24h"
      );
    }

    throw new Error(
      "No se pudo enviar ningún tipo de mensaje después de intentar todas las opciones"
    );
  } catch (error) {
    logError(
      `❌ Error fatal enviando WhatsApp a +${fullPhone}: ${error.message}`
    );
    return {
      success: false,
      error: error.message,
      code: error.code || "unknown",
    };
  }
}

async function checkIfWithin24hWindow(phoneNumber) {
  return false; // En producción deberías consultar tu base de datos
}

module.exports = {
  sendWhatsAppMessage,
  checkIfWithin24hWindow,
};
