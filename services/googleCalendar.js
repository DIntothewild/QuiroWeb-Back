require("dotenv").config();
const { google } = require("googleapis");

// Función para formatear correctamente la clave privada
function formatPrivateKey(key) {
  if (!key || typeof key !== "string") return null;
  // Asegurarse de que la clave tiene los saltos de línea correctos
  return key.replace(/\\n/g, "\n");
}

// Configuración de autenticación
function getAuth() {
  // Opción 1: Usar JSON completo si está disponible
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      );
      console.log("✅ Usando credenciales de Google desde JSON completo");
      return new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      });
    } catch (error) {
      console.error("❌ Error al parsear JSON de credenciales:", error.message);
      // Continuar con el siguiente método si este falla
    }
  }

  // Opción 2: Usar variables individuales
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

  try {
    console.log("🔄 Intentando crear evento en Google Calendar...");
    const calendar = await getCalendarClient();

    // Verificar que el ID del calendario esté configurado
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      throw new Error("ID del calendario no configurado");
    }

    console.log(`📅 Usando calendario: ${calendarId}`);

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      sendUpdates: "all", // Enviar invitación al cliente
    });

    console.log("✅ Evento creado en Google Calendar:", response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error("❌ Error al crear evento en Google Calendar:", error);

    // Mensajes de error más detallados para facilitar depuración
    if (error.message) {
      console.error(`Mensaje de error: ${error.message}`);

      if (
        error.message.includes("permission") ||
        error.message.includes("Permission")
      ) {
        console.error(
          "🔑 ERROR DE PERMISOS: La cuenta de servicio no tiene acceso al calendario."
        );
        console.error(
          "Asegúrate de compartir el calendario con:",
          process.env.GOOGLE_CLIENT_EMAIL
        );
      }

      if (
        error.message.includes("not found") ||
        error.message.includes("Not Found")
      ) {
        console.error(
          "❓ ERROR DE CALENDARIO: El ID de calendario no existe o no es accesible."
        );
        console.error(
          "Verifica que el ID sea correcto:",
          process.env.GOOGLE_CALENDAR_ID
        );
      }
    }

    throw error;
  }
}

module.exports = { addEventToCalendar };
