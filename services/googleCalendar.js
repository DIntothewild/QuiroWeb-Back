require("dotenv").config();
const { google } = require("googleapis");

// Parsear credenciales desde la variable de entorno
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  console.log("✅ Credenciales de Google cargadas correctamente");
} catch (error) {
  console.error("❌ Error al parsear credenciales de Google:", error);
  console.error("Detalles:", error.message);
  throw new Error("No se pudieron cargar las credenciales de Google");
}

// Configuración de autenticación usando las credenciales completas
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

// Función para obtener el cliente autorizado
async function getCalendarClient() {
  try {
    const client = await auth.getClient();
    return google.calendar({ version: "v3", auth: client });
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
    const response = await calendar.events.insert({
      calendarId: credentials.client_email, // ✅ este es el id correcto
      resource: event,
      sendUpdates: "all", // 🔔 Enviar invitación al cliente
    });

    console.log("✅ Evento creado:", response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error("❌ Error al crear evento en Google Calendar:", error);
    if (error.message) console.error(`Mensaje de error: ${error.message}`);
    if (error.code) console.error(`Código de error: ${error.code}`);
    throw error;
  }
}

module.exports = { addEventToCalendar };
