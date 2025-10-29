const webpush = require('web-push');

// Usa variables de entorno si están disponibles, sino cae a las actuales
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || "BBR2W5ZrA8jgnh1dB_vbVAzu4PVS5t81sXyv_B-bdbkUCUd0d-ZglMsXTHcJTIRa7RY9erDAcm0NlkYkZnZ2DgY";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "BIdljMrJYmsTBR27TdujeT8vZtxzStasvFIu__7W8OU";
const mailto = process.env.VAPID_MAILTO || "mailto:tucorreo@ejemplo.com";

webpush.setVapidDetails(mailto, publicVapidKey, privateVapidKey);

module.exports = webpush;


