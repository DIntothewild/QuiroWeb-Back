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

  // Formatea las variables
  const safeCustomerName = (customerName || "").trim().substring(0, 50);
  const safeTerapiasType = (terapiasType || "").trim().substring(0, 30);
  const safeDate = (date || "").trim();
  const safeTime = (time || "").trim();

  const useTemplateFirst = forceTemplate || !recentInteraction;

  try {
    if (useTemplateFirst) {
      // Verificar el ContentSID y mostrarlo en logs
      logInfo(`🔑 Usando contentSid: ${contentSid}`);

      if (!contentSid) {
        logError("❌ ContentSid no definido en variables de entorno");
        return { success: false, error: "ContentSid no configurado" };
      }

      // ✅ Verificación de variables
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

      try {
        // Intento #1: Con JSON.stringify y variables originales
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

          // Intento #2: Sin JSON.stringify
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

            logSuccess(
              `📲 Mensaje con plantilla enviado (SID: ${message.sid})`
            );
            return { success: true, messageSid: message.sid };
          } catch (error2) {
            logWarning(`⚠️ Intento #2 falló: ${error2.message}`);

            // Intento #3: Con formato de fecha diferente
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
              // Continuar con fallback de mensaje directo
              throw new Error("Todos los intentos con plantilla fallaron");
            }
          }
        }
      } catch (templateError) {
        logWarning(`⚠️ Error final con plantilla: ${templateError.message}`);

        if (!recentInteraction) {
          logWarning(
            "⚠️ Sin confirmación de interacción reciente. Puede fallar el siguiente intento."
          );
        }

        // Fallback a mensaje directo
        const body = `¡Hola ${safeCustomerName}! 👋\n\nTu reserva de *${safeTerapiasType}* ha sido confirmada ✅\n\n📅 Fecha: ${safeDate}\n⏰ Hora: ${safeTime}\n\nSi necesitas cancelar o cambiar tu cita, por favor contáctanos.\n\n¡Gracias por confiar en Wellness Flow 🌿`;

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
      // Resto del código igual...
    }
  } catch (finalError) {
    // Resto del código igual...
  }
}
