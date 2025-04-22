require("dotenv").config();
const { google } = require("googleapis");

// Función para formatear correctamente la clave privada
function formatPrivateKey(key) {
  if (!key || typeof key !== "string") return null;
  return key.replace(/\\n/g, "\n");
}

// Configuración de autenticación - CAMBIO IMPORTANTE: SIEMPRE usar JWT
function getAuth() {
  // Obtener credenciales
  const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  if (!privateKey) {
    console.error("❌ Clave privada no disponible o mal formateada");
    throw new Error("Clave privada no disponible");
  }

  if (!clientEmail) {
    console.error("❌ Email del cliente no disponible");
    throw new Error("Email del cliente no disponible");
  }

  console.log(`✅ Usando cuenta de servicio: ${clientEmail}`);

  // USAR JWT DIRECTAMENTE - Esto es crucial
  return new google.auth.JWT(clientEmail, null, privateKey, [
    "https://www.googleapis.com/auth/calendar",
  ]);
}

// Función para obtener el cliente autorizado
async function getCalendarClient() {
  try {
    const auth = getAuth();
    return google.calendar({ version: "v3", auth });
  } catch (error) {
    console.error("❌ Error al crear cliente de calendario:", error);
    throw error;
  }
}

// Función para mejorar la descripción del evento
function formatExtraInfo(booking) {
  if (booking.terapiasType === "Quiromasaje") {
    return `Tipo de masaje: ${booking.tipoMasaje || "No especificado"}`;
  }

  if (booking.terapiasType === "Osteopatía") {
    return `Zona a tratar: ${booking.tipoMasaje || "No especificada"}`;
  }

  if (booking.terapiasType === "Entrenamiento personal") {
    try {
      const objetivos = JSON.parse(booking.tipoMasaje);
      const activos = Object.entries(objetivos)
        .filter(
          ([key, value]) => value === true && key !== "comentarioEntrenamiento"
        )
        .map(([key]) => `✔️ ${key}`);
      const comentario = objetivos.comentarioEntrenamiento || "";
      return `Objetivos:\n${activos.join("\n")}\nComentario: ${comentario}`;
    } catch {
      return "Objetivos no disponibles";
    }
  }

  return "";
}

// Función para crear y enviar evento a Google Calendar
async function addEventToCalendar(booking) {
  const startDateTime = `${booking.date}T${booking.time}:00`;

  const [startHour, startMinute] = booking.time.split(":").map(Number);
  const endHour = startHour + 1;
  const endDateTime = `${booking.date}T${String(endHour).padStart(
    2,
    "0"
  )}:${String(startMinute).padStart(2, "0")}:00`;

  const event = {
    summary: `Reserva: ${booking.terapiasType}`,
    description: `Cliente: ${booking.customerName}\n${formatExtraInfo(
      booking
    )}\nComentario: ${booking.comentario || "Sin comentarios"}`,
    start: {
      dateTime: startDateTime,
      timeZone: "Europe/Madrid",
    },
    end: {
      dateTime: endDateTime,
      timeZone: "Europe/Madrid",
    },
    attendees: booking.email ? [{ email: booking.email }] : [],
  };

  // Lista de calendarios a intentar, en orden de prioridad
  const calendarsToTry = ["primary"];

  try {
    console.log("🔄 Intentando crear evento en Google Calendar...");
    const calendar = await getCalendarClient();

    // Intento con diferentes calendarios
    let lastError = null;

    for (const calendarId of calendarsToTry) {
      try {
        console.log(`📅 Intentando con calendario: ${calendarId}`);

        const response = await calendar.events.insert({
          calendarId: calendarId,
          resource: event,
          sendUpdates: "all",
        });

        console.log(
          "✅ Evento creado en Google Calendar:",
          response.data.htmlLink
        );
        return response.data;
      } catch (error) {
        console.warn(`⚠️ Error con calendario ${calendarId}:`, error.message);
        lastError = error;
        // Continuar con el siguiente calendario
      }
    }

    // Si todos los intentos fallaron, mostrar un mensaje más explícito
    throw (
      lastError || new Error("No se pudo crear el evento en ningún calendario")
    );
  } catch (error) {
    console.error(
      "❌ Error al crear evento en Google Calendar:",
      error.message
    );

    // No detener la aplicación, devolver una respuesta para que siga funcionando
    console.log("⚠️ Continuando con el flujo sin evento en calendario");

    return {
      htmlLink: "https://calendar.google.com",
      status: "limited",
      id: "eventos-" + Date.now(),
      error: error.message,
    };
  }
}

module.exports = { addEventToCalendar };
