// Whatever the UI/route layer passes in, only these exact values are ever
// shelled out — control.js rejects anything else before touching execFile.
const ALLOWED_UNITS = ["whisper-api", "ollama"];
const ALLOWED_VERBS = ["start", "stop", "restart", "status"];

function isAllowed(unit, verb) {
  return ALLOWED_UNITS.includes(unit) && ALLOWED_VERBS.includes(verb);
}

module.exports = { ALLOWED_UNITS, ALLOWED_VERBS, isAllowed };
