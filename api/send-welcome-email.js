// v1.0 - Welcome email sender for EimemesChat AI signup flow
// Changelog:
//   v1.0 - Initial version: Gmail nodemailer transport, env-based credentials,
//          full branded HTML template, POST /api/send-welcome-email endpoint

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function buildHtml(name) {
  const greetingName = name ? name : "there";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EimemesChat AI</title>
</head>

<body style="margin:0;padding:40px 0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">

<tr>
<td style="background:#111827;padding:40px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:34px;">
EimemesChat AI
</h1>

<p style="margin-top:14px;color:#d1d5db;font-size:17px;line-height:1.6;">
Intelligent conversations built for the Kuki community.
</p>
</td>
</tr>

<tr>
<td style="padding:40px;">

<h2 style="margin-top:0;color:#111827;">
Welcome, ${greetingName}
</h2>

<p style="font-size:16px;line-height:1.8;color:#4b5563;">
Thank you for joining EimemesChat AI. Our mission is to provide fast, intelligent and meaningful conversations while supporting Kuki language and culture.
</p>

<table width="100%" cellpadding="10" cellspacing="0">
<tr>

<td width="50%" valign="top" style="border:1px solid #eeeeee;border-radius:8px;">
<h3>Features</h3>

<ul style="padding-left:18px;color:#555;line-height:1.8;">
<li>Natural AI conversations</li>
<li>English & Kuki support</li>
<li>Translation assistance</li>
<li>Learning companion</li>
<li>Privacy-focused design</li>
</ul>
</td>

<td width="50%" valign="top" style="border:1px solid #eeeeee;border-radius:8px;">
<h3>Vision</h3>

<p style="color:#555;line-height:1.8;">
Making modern AI accessible while preserving Kuki knowledge, language and culture for future generations.
</p>
</td>

</tr>
</table>

<p style="text-align:center;margin:40px 0;">

<a href="https://eimemeschat.com"
style="background:#111827;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;display:inline-block;">
Visit EimemesChat AI
</a>

</p>

<hr style="border:none;border-top:1px solid #eeeeee;">

<p style="font-size:15px;color:#666;line-height:1.8;">
If you didn't create this account, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td style="background:#fafafa;padding:25px;text-align:center;color:#888;font-size:13px;">
<strong>EimemesChat AI</strong><br>
Building intelligent technology for the Kuki community.<br><br>
&copy; 2026 EimemesChat AI
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, name } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const info = await transporter.sendMail({
      from: `"EimemesChat AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to EimemesChat AI",
      text: `Welcome to EimemesChat AI${name ? ", " + name : ""}! Visit https://eimemeschat.com to get started.`,
      html: buildHtml(name),
    });
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Welcome email failed:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
};
