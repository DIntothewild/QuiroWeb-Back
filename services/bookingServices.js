const Booking = require("../models/booking");
const { addEventToCalendar } = require("./googleCalendar");
const { sendCalendarLinkEmail } = require("./emailServices");
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

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

  // Email y Calendar
  let calendarLink = "";
  try {
    const calendarResponse = await addEventToCalendar(reserva);
    calendarLink = calendarResponse.htmlLink;
    console.log("✅ Evento en Google Calendar:", calendarLink);
  } catch (calendarError) {
    console.error("❌ Error con Google Calendar:", calendarError.message);
  }

  if (email && email.trim() !== "") {
    try {
      console.log("✉️ Enviando email a:", email);
      await sendCalendarLinkEmail(
        email,
        calendarLink || "https://calendar.google.com"
      );
    } catch (emailError) {
      console.error("❌ Error al enviar correo:", emailError.message);
    }
  }

  // WhatsApp
  if (phoneNumber && phoneNumber.length >= 9) {
    const fullPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+34${phoneNumber}`;
    const mensaje = `Hola ${customerName}, gracias por tu reserva en Wellness Flow 🌿. Te esperamos el ${date} a las ${time}.`;

    try {
      await twilioClient.messages.create({
        from: "whatsapp:+14155238886",
        to: `whatsapp:${fullPhone}`,
        body: mensaje,
      });
      console.log("📲 Mensaje WhatsApp enviado");
    } catch (whatsErr) {
      console.error("❌ Error al enviar WhatsApp:", whatsErr.message);
    }
  }

  return reserva;
}

module.exports = {
  procesarReserva,
};
