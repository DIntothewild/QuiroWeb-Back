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
const fallbackSid = process.env.TWILIO_FALLBACK_TEMPLATE_SID;

const client = twilio(accountSid, authToken);

/**
 * Envía mensaje de WhatsApp usando plantillas de Twilio
 * @param {Object} params - Parámetros para el mensaje
 * @returns {Object} - Resultado de la operación
 */
async function sendWhatsAppMessage(params) {
  const {
    customerName,
    terapiasType,
    phoneNumber,
    date,
    time,
    forceTemplate = false,
    recentInteraction = false,
    useMinimalTemplateOnly = false, // Nueva opción basada en tu propuesta
  } = params;

  // Validar parámetros esenciales
  if (!phoneNumber) {
    logError("❌ Número de teléfono no proporcionado");
    return { success: false, error: "Número de teléfono requerido" };
  }

  // Limpieza y formato del teléfono
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("34")
    ? cleanPhone
    : `34${cleanPhone}`;
  const formattedPhone = `whatsapp:+${fullPhone}`;

  // Formateo de variables para la plantilla
  const safeCustomerName = (customerName || "").trim().substring(0, 50);
  const safeTerapiasType = (terapiasType || "").trim().substring(0, 30);

  // Formateo específico de fecha para Twilio (DD/MM/YYYY)
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
    // Si useMinimalTemplateOnly es true, saltamos directamente a la plantilla básica
    if (!useMinimalTemplateOnly) {
      // 1. INTENTO CON PLANTILLA PRINCIPAL
      if (contentSid) {
        logInfo(
          `🔑 Usando plantilla principal (ContentSID: ${contentSid.substring(
            0,
            10
          )}...)`
        );

        // Debug: Mostrar variables
        logInfo("📋 Variables para plantilla:");
        console.log({
          customerName: safeCustomerName,
          terapiasType: safeTerapiasType,
          date: safeDate,
          time: safeTime,
        });

        try {
          // Intentar enviar con contentVariables como JSON string
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

          logSuccess(
            `✅ Mensaje con plantilla principal enviado: ${message.sid}`
          );
          return { success: true, messageSid: message.sid };
        } catch (primaryError) {
          logWarning(
            `⚠️ Error con plantilla principal: ${primaryError.message}`
          );

          // Debug detallado del error
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

    // 2. INTENTO CON PLANTILLA DE RESPALDO (MÍNIMA)
    if (fallbackSid) {
      logInfo(
        `🔄 Intentando con plantilla básica (SID: ${fallbackSid.substring(
          0,
          10
        )}...)`
      );

      try {
        // Para la plantilla básica, no enviamos variables ya que no las necesita
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
        logInfo(
          `📋 Detalles del error: ${JSON.stringify(fallbackError, null, 2)}`
        );
      }
    }

    // 3. ÚLTIMO RECURSO: MENSAJE SIMPLE (SOLO FUNCIONA DENTRO DE LA VENTANA DE 24H)
    // Verificamos si estamos en la ventana de 24h o es una respuesta
    if (recentInteraction) {
      try {
        logInfo(`🔄 Intentando enviar mensaje simple como último recurso`);

        // Crear mensaje simple personalizado
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

    // Si llegamos aquí, ninguna opción funcionó
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

/**
 * Verifica si el usuario está dentro de la ventana de 24h para mensajes
 * @param {String} phoneNumber - Número de teléfono a verificar
 * @returns {Promise<Boolean>} - True si está dentro de la ventana
 */
async function checkIfWithin24hWindow(phoneNumber) {
  try {
    // En una implementación real, consultarías tu base de datos
    // para ver cuándo fue la última interacción con este número

    // Ejemplo: Consultar la colección de mensajes o interacciones
    // const lastInteraction = await db.collection('interactions')
    //   .findOne({ phoneNumber }, { sort: { timestamp: -1 } });
    //
    // if (!lastInteraction) return false;
    //
    // const hoursSinceLastInteraction =
    //   (Date.now() - lastInteraction.timestamp) / (1000 * 60 * 60);
    //
    // return hoursSinceLastInteraction <= 24;

    // Por ahora, devolvemos false como en tu ejemplo
    return false;
  } catch (error) {
    logError(`❌ Error verificando ventana de 24h: ${error.message}`);
    return false; // Por seguridad, asumimos que no está en la ventana
  }
}

module.exports = {
  sendWhatsAppMessage,
  checkIfWithin24hWindow,
};
