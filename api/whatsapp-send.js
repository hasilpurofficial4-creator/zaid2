// WhatsApp Send API - Proxied to Render bot backend
const { proxyToRender } = require('./_wa-proxy');
module.exports = async function handler(req, res) {
  return proxyToRender(req, res);
};
