require("dotenv").config();
const { google } = require("googleapis");

// 👉 Función para formatear correctamente la clave privada
function formatPrivateKey(key) {
  if (!key || typeof key !== "string") return null;
  return key.replace(/\\n/g, "\n");
}

// 👉 Configuración de autenticación
function getAuth() {
  // Opción 1: Usar JSON completo si está disponible
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      );
      console.log("✅ Usando credenciales desde JSON completo");

      const clientEmail = credentials.client_email;
      const privateKey = credentials.private_key;

      return new google.auth.JWT(clientEmail, null, privateKey, [
        "https://www.googleapis.com/auth/calendar",
      ]);
    } catch (error) {
      console.error(
        "❌ Error al parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:",
        error.message
      );
    }
  }

  // Opción 2: Usar variables de entorno separadas
  const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error("❌ Clave privada o email del cliente no disponibles");
  }

  console.log(`✅ Usando cuenta de servicio: ${clientEmail}`);

  return new google.auth.JWT(clientEmail, null, privateKey, [
    "https://www.googleapis.com/auth/calendar",
  ]);
}

// 👉 Obtener el cliente de Google Calendar autorizado
async function getCalendarClient() {
  try {
    const auth = getAuth();
    return google.calendar({ version: "v3", auth });
  } catch (error) {
    console.error("❌ Error al crear cliente de Google Calendar:", error);
    throw error;
  }
}

// 👉 Formatear descripción extra del evento según el tipo de terapia
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

// 👉 Crear y enviar evento a Google Calendar
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
    start: { dateTime: startDateTime, timeZone: "Europe/Madrid" },
    end: { dateTime: endDateTime, timeZone: "Europe/Madrid" },
    attendees: booking.email
      ? [{ email: booking.email, responseStatus: "needsAction" }]
      : [],
  };

  try {
    console.log("🔄 Intentando crear evento en Google Calendar...");

    const calendar = await getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "wellssflow@gmail.com";
    console.log(`📅 Usando calendario: ${calendarId}`);

    const response = await calendar.events.insert({
      calendarId,
      resource: event,
      sendUpdates: "all",
    });

    console.log("✅ Evento creado:", response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error("❌ Error al crear evento en Google Calendar:", error);

    if (error.code === 404) {
      console.error(
        "⚠️ El calendario no existe o no está compartido con la cuenta de servicio."
      );
    } else if (error.code === 403) {
      console.error("🚫 Permisos insuficientes para crear eventos.");
    }

    return {
      htmlLink: "https://calendar.google.com",
      status: "invitation_only",
    };
  }
}

module.exports = { addEventToCalendar };
