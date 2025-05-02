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
const twilioPhoneNumber = `whatsapp:${
  process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"
}`;
const TWILIO_CONTENT_SID =
  process.env.TWILIO_CONTENT_SID || "HX0c9f3a05634a57e2805db0f4ef8d1f2";

// Verificar credenciales
if (!accountSid || !authToken) {
  logWarning("⚠️ Credenciales de Twilio no configuradas correctamente");
}

// Inicializar cliente de Twilio
const client = twilio(accountSid, authToken);

/**
 * Función principal mejorada que implementa una estrategia híbrida inteligente
 * para maximizar la probabilidad de entrega de mensajes WhatsApp
 *
 * @param {Object} booking - Objeto con datos de la reserva
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<string|null>} - SID del mensaje o null en caso de error
 */
async function sendWhatsAppMessage(booking, options = {}) {
  // Validar entrada
  if (!booking || typeof booking !== "object") {
    logError("❌ No se recibió un objeto de reserva válido");
    return null;
  }

  const {
    customerName,
    terapiasType,
    phoneNumber,
    dateTime,
    date,
    time,
    forceTemplate = false, // Opción para forzar uso de plantilla
    recentInteraction = false, // Indicador si hubo interacción reciente
  } = { ...booking, ...options };

  // Validar campos requeridos
  if (!customerName || !terapiasType || !phoneNumber) {
    logError("❌ Faltan datos necesarios en la reserva:", booking);
    return null;
  }

  // Procesar fecha y hora
  const fullDateTime = dateTime || (date && time ? `${date} ${time}` : null);
  if (!fullDateTime) {
    logError("❌ No se pudo determinar la fecha y hora de la reserva");
    return null;
  }

  // Preparar número de teléfono
  let cleanPhone = phoneNumber.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("34")
    ? cleanPhone
    : `34${cleanPhone}`;
  const formattedPhone = `whatsapp:+${fullPhone}`;

  // Extraer fecha y hora
  const [fecha, hora] = fullDateTime.split(" ");
  if (!fecha || !hora) {
    logError("❌ El formato de dateTime es incorrecto:", fullDateTime);
    return null;
  }

  // ---- ESTRATEGIA INTELIGENTE ----
  // 1. Si tenemos confirmación de interacción reciente (24h) o el usuario no quiere forzar plantilla:
  //    intentamos primero con mensaje de formato libre (más flexible)
  // 2. Si eso falla con error 63016, o si no hay interacción reciente confirmada:
  //    usamos la plantilla aprobada (más confiable fuera de ventana 24h)
  // 3. Si la plantilla falla, intentamos un mensaje básico como último recurso

  // Determinar si usar primero plantilla o mensaje libre
  const useTemplateFirst = forceTemplate || !recentInteraction;

  try {
    // ESTRATEGIA A: Intentar primero con la plantilla aprobada
    if (useTemplateFirst) {
      logInfo(`🔄 Usando primero plantilla aprobada para +${fullPhone}`);

      try {
        const templateRes = await sendWithApprovedTemplate(formattedPhone, {
          customerName,
          terapiasType,
          fecha,
          hora,
        });
        return templateRes;
      } catch (templateError) {
        // Si la plantilla falla, intentamos con mensaje directo como fallback
        logWarning(
          `⚠️ Error con plantilla. Intentando con mensaje directo: ${templateError.message}`
        );

        if (!recentInteraction) {
          logWarning(
            "⚠️ Sin confirmación de interacción reciente. Es posible que falle."
          );
        }

        const directRes = await sendWithDirectMessage(formattedPhone, {
          customerName,
          terapiasType,
          fecha,
          hora,
        });
        return directRes;
      }
    }
    // ESTRATEGIA B: Intentar primero con mensaje directo (dentro de ventana 24h)
    else {
      logInfo(
        `🔄 Usando primero mensaje directo para +${fullPhone} (interacción reciente)`
      );

      try {
        const directRes = await sendWithDirectMessage(formattedPhone, {
          customerName,
          terapiasType,
          fecha,
          hora,
        });
        return directRes;
      } catch (directError) {
        // Si el error es 63016 (fuera de ventana 24h), intentamos con plantilla
        if (
          directError.code === 63016 ||
          directError.message.includes("outside the allowed window")
        ) {
          logWarning(
            "⚠️ Error 63016: Fuera de ventana 24h. Intentando con plantilla aprobada."
          );

          const templateRes = await sendWithApprovedTemplate(formattedPhone, {
            customerName,
            terapiasType,
            fecha,
            hora,
          });
          return templateRes;
        } else {
          // Otro tipo de error, lo propagamos
          throw directError;
        }
      }
    }
  } catch (error) {
    // Manejo final de errores - último intento con mensaje muy básico
    logError(`❌ Error enviando WhatsApp a +${fullPhone}: ${error.message}`);

    try {
      logWarning("⚠️ Último intento con mensaje básico de emergencia...");

      const emergencyMessage = `Reserva confirmada: ${terapiasType}, ${fecha} ${hora}`;

      const fallbackRes = await client.messages.create({
        from: twilioPhoneNumber,
        to: formattedPhone,
        body: emergencyMessage,
      });

      logSuccess(
        `📲 WhatsApp (emergencia) enviado a +${fullPhone} (SID: ${fallbackRes.sid})`
      );
      return fallbackRes.sid;
    } catch (emergencyError) {
      logError(`❌ Todos los intentos fallaron para +${fullPhone}`);
      // No lanzamos el error, la reserva seguirá creándose
      return null;
    }
  }
}

/**
 * Envía mensaje usando la plantilla aprobada de WhatsApp
 * @private
 */
async function sendWithApprovedTemplate(
  to,
  { customerName, terapiasType, fecha, hora }
) {
  const res = await client.messages.create({
    from: twilioPhoneNumber,
    to: to,
    contentSid: TWILIO_CONTENT_SID,
    contentVariables: JSON.stringify({
      1: customerName,
      2: terapiasType,
      3: fecha,
      4: hora,
    }),
  });

  logSuccess(`📲 WhatsApp con plantilla enviado a ${to} (SID: ${res.sid})`);
  return res.sid;
}

/**
 * Envía mensaje directo en formato libre (para usar dentro de ventana 24h)
 * @private
 */
async function sendWithDirectMessage(
  to,
  { customerName, terapiasType, fecha, hora }
) {
  const bodyText = `¡Hola ${customerName}! 👋\n\nTu reserva de *${terapiasType}* ha sido confirmada ✅\n\n📅 Fecha: ${fecha}\n⏰ Hora: ${hora}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Gracias por confiar en Wellness Flow 🌿`;

  const res = await client.messages.create({
    from: twilioPhoneNumber,
    to: to,
    body: bodyText,
  });

  logSuccess(`📲 WhatsApp directo enviado a ${to} (SID: ${res.sid})`);
  return res.sid;
}

/**
 * Registra una interacción de usuario para seguimiento de ventana 24h
 * Esta función debe llamarse cuando el usuario envía un mensaje a tu sistema
 *
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {boolean} - Éxito del registro
 */
function registerUserInteraction(phoneNumber) {
  // Aquí puedes implementar la lógica para registrar en base de datos
  // cuando un usuario interactúa con tu sistema, para poder determinar
  // más tarde si está dentro de la ventana de 24h

  // Este es un ejemplo simple, en producción deberías guardar en BD
  try {
    // Ejemplo: guardar en memoria (para demostración)
    // En producción: usar Redis, MongoDB, MySQL, etc.
    const timestamp = new Date().toISOString();
    console.log(
      `📝 Registrando interacción de usuario ${phoneNumber} en ${timestamp}`
    );

    // Simulación de guardado exitoso
    return true;
  } catch (error) {
    logError(`❌ Error al registrar interacción: ${error.message}`);
    return false;
  }
}

/**
 * Verifica si un usuario ha interactuado recientemente (últimas 24h)
 *
 * @param {string} phoneNumber - Número de teléfono a verificar
 * @returns {Promise<boolean>} - True si hay interacción reciente
 */
async function hasRecentInteraction(phoneNumber) {
  // Aquí implementarías la consulta a tu base de datos
  // para determinar si el usuario ha interactuado en las últimas 24h

  // Este es un ejemplo de implementación, deberías adaptarlo
  // a tu sistema de almacenamiento real
  try {
    // Simulación de consulta (en producción: consulta a Redis/DB)
    // Por defecto asumimos que no hay interacción reciente
    return false;
  } catch (error) {
    logError(`❌ Error verificando interacciones: ${error.message}`);
    return false; // Por seguridad, asumimos que no hay
  }
}

module.exports = {
  sendWhatsAppMessage,
  registerUserInteraction,
  hasRecentInteraction,
};
