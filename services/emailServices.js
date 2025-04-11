const nodemailer = require("nodemailer");

// Transporter básico usando una cuenta de Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "wellssflow@gmail.com",
    pass: "bnmq csxy vole edos",
  },
});

// Función para enviar el correo
async function sendCalendarLinkEmail(toEmail, calendarLink) {
  const mailOptions = {
    from: '"Wellness Flow" <wellssflow@gmail.com>',
    to: toEmail,
    subject: "Tu cita ha sido reservada - Añádela a tu calendario",
    html: `
      <h2>Gracias por tu reserva</h2>
      <p>Puedes añadirla a tu Google Calendar con este enlace:</p>
      <a href="${calendarLink}" target="_blank">${calendarLink}</a>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✉️ Correo enviado:", info.response);
  } catch (error) {
    console.error("❌ Error al enviar el correo:", error);
  }
}

module.exports = { sendCalendarLinkEmail };
