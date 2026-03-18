const { Resend } = require("resend");
const fs = require("fs");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCalendarLinkEmail(toEmail, calendarLink) {
  try {
    const { error } = await resend.emails.send({
      from: "Wellness Flow <onboarding@resend.dev>",
      to: toEmail,
      subject: "Tu cita ha sido reservada - Añádela a tu calendario",
      html: `
        <h2>Gracias por tu reserva</h2>
        <p>Puedes añadirla a tu Google Calendar con este enlace:</p>
        <a href="${calendarLink}" target="_blank">${calendarLink}</a>
      `,
    });
    if (error) throw error;
    console.log("✉️ Correo enviado a:", toEmail);
  } catch (error) {
    console.error("❌ Error al enviar correo:", error);
    throw error;
  }
}

async function sendICSCalendarEmail(toEmail, filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const { error } = await resend.emails.send({
      from: "Wellness Flow <onboarding@resend.dev>",
      to: toEmail,
      subject: "Tu reserva en Wellness Flow - Añádela a tu calendario",
      html: `
        <h2>Gracias por tu reserva</h2>
        <p>Adjunto encontrarás el archivo para añadir tu cita a tu calendario.</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: fileContent,
        },
      ],
    });
    if (error) throw error;
    console.log("📩 Correo con .ics enviado a:", toEmail);
  } catch (error) {
    console.error("❌ Error al enviar correo con .ics:", error);
    throw error;
  } finally {
    try {
      fs.unlinkSync(filePath);
      console.log("🧹 Archivo .ics eliminado:", filePath);
    } catch (deleteError) {
      console.error("❌ Error al borrar archivo .ics:", deleteError);
    }
  }
}

module.exports = { sendCalendarLinkEmail, sendICSCalendarEmail };