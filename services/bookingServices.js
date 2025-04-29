const Booking = require("../models/booking");
const { addEventToCalendar } = require("./googleCalendar");
const { generateICSFile } = require("./icsService");
const { sendICSCalendarEmail } = require("./emailServices");
const { sendWhatsAppMessage } = require("./whatsappService");
const { logSuccess, logError } = require("./logger");

async function procesarReserva(datos) {
  const {
    terapiasType,
    dateTime,
    customerName,
    extra = {},
    email = "",
    phoneNumber = "",
    status = "booked",
  } = datos;

  if (!terapiasType) {
    throw new Error("No se ha especificado el tipo de terapia.");
  }

  if (!dateTime) {
    throw new Error("No se ha proporcionado dateTime.");
  }

  const [date, time] = dateTime.split(" ");

  const duplicado = await Booking.findOne({
    date,
    time,
    terapiasType,
  });

  if (duplicado) {
    throw new Error("Ya existe una reserva para esta fecha, hora y terapia.");
  }

  const reserva = new Booking({
    customerName,
    terapiasType,
    date,
    time,
    status,
    email,
    phoneNumber,
    tipoMasaje: "",
    comentario: "",
  });

  switch (terapiasType) {
    case "Quiromasaje":
      reserva.tipoMasaje = extra.tipoMasaje || "";
      reserva.comentario = extra.comentario || "";
      break;
    case "Osteopatía":
      reserva.tipoMasaje = extra.zonaTratar || "";
      reserva.comentario = extra.osteoComentario || "";
      break;
    case "Entrenamiento personal":
      reserva.tipoMasaje = JSON.stringify(extra.objetivos || {});
      reserva.comentario = "";
      break;
    default:
      reserva.tipoMasaje = extra.tipoMasaje || "";
      reserva.comentario = extra.comentario || "";
      break;
  }

  await reserva.save();
  console.log("✅ Reserva guardada:", reserva);

  // Calendar
  try {
    const calendarResponse = await addEventToCalendar(reserva);
    const calendarLink = calendarResponse.htmlLink;
    console.log("✅ Evento en Google Calendar:", calendarLink);
    logSuccess(`Evento creado en Google Calendar: ${calendarLink}`);
  } catch (calendarError) {
    console.error("❌ Error con Google Calendar:", calendarError.message);
  }

  // Enviar archivo .ics por email
  if (email && email.trim() !== "") {
    try {
      const { filePath, fileName } = await generateICSFile(reserva);
      await sendICSCalendarEmail(email, filePath, fileName);
      console.log(`📧 Archivo .ics enviado a: ${email}`);
    } catch (icsEmailErr) {
      console.error("❌ Error al enviar .ics:", icsEmailErr.message);
    }
  }

  // WhatsApp
  if (phoneNumber && phoneNumber.length >= 9) {
    try {
      // Creamos un objeto específico para WhatsApp
      const whatsappData = {
        phoneNumber: phoneNumber,
        customerName: customerName,
        terapiasType: terapiasType,
        date: date,
        time: time,
      };

      console.log("📱 Datos para WhatsApp:", whatsappData);

      await sendWhatsAppMessage(whatsappData, "confirmation");
      logSuccess("📲 Mensaje WhatsApp enviado");
    } catch (whatsErr) {
      logError(
        `❌ Error al enviar WhatsApp (${whatsErr.code || "unknown"}): ${
          whatsErr.message
        }`
      );
    }
  }
}

module.exports = {
  procesarReserva,
};
