// Calls systemctl via execFile (never a shell), against the explicit
// allowlist in allowlist.js — so even a bug upstream in a route handler can't
// pass through unexpected unit/verb input. In production this runs as the
// unprivileged `echolocal-ai` LXC user via a narrow sudoers rule (see
// scripts/setup-sudoers.sh); locally (off the LXC) it will fail with
// ENOENT/ENOTFOUND and callers should treat that as "control unavailable here".
const { execFile } = require("child_process");
const { isAllowed } = require("./allowlist");

function runSystemctl(verb, unit) {
  return new Promise((resolve, reject) => {
    if (!isAllowed(unit, verb)) {
      reject(new Error(`Rejected: unit "${unit}" / verb "${verb}" is not in the allowlist`));
      return;
    }
    const useSudo = process.platform === "linux" && process.env.SYSTEMCTL_NO_SUDO !== "1";
    const cmd = useSudo ? "sudo" : "systemctl";
    const args = useSudo ? ["/usr/bin/systemctl", verb, unit] : [verb, unit];

    execFile(cmd, args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * `systemctl is-active <unit>` is read-only (no sudo needed) and prints
 * exactly "active" | "inactive" | "failed" | "unknown" to stdout — much
 * cleaner to parse than `status`'s multi-line human output.
 */
function isActive(unit) {
  return new Promise((resolve) => {
    if (!isAllowed(unit, "status")) {
      resolve("unknown");
      return;
    }
    execFile("systemctl", ["is-active", unit], { timeout: 5000 }, (_error, stdout) => {
      const state = stdout?.trim();
      resolve(["active", "inactive", "failed"].includes(state) ? state : "unknown");
    });
  });
}

module.exports = { runSystemctl, isActive };
