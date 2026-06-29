const { isActive } = require("../systemctl/control");

async function getServiceStatus() {
  const [whisperApi, ollama] = await Promise.all([isActive("whisper-api"), isActive("ollama")]);
  return { whisperApi, ollama };
}

function getMockServiceStatus() {
  return { whisperApi: "active", ollama: "active" };
}

module.exports = { getServiceStatus, getMockServiceStatus };
