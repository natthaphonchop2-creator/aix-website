import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }, 2_000);
  timer.unref();
  await exited;
  clearTimeout(timer);
}

export async function startTestServer(overrides = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), "aix-phase0-"));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AIX_SKIP_LOCAL_ENV: "1",
      AIX_LISTEN_HOST: "127.0.0.1",
      NODE_ENV: "test",
      PORT: String(port),
      DATA_DIR: dataDir,
      UPLOAD_DIR: join(dataDir, "uploads"),
      DATABASE_URL: "",
      SUPABASE_DATABASE_URL: "",
      SUPABASE_DB_URL: "",
      APP_ORIGINS: origin,
      AUTH_SECRET: "test-auth-secret-000000000000000000000000",
      CSRF_SECRET: "test-csrf-secret-000000000000000000000000",
      SMS_OTP_SECRET: "test-sms-secret-0000000000000000000000000",
      ADMIN_EMAIL: "owner@example.com",
      ADMIN_PASSWORD: "correct-horse-battery-staple",
      GOOGLE_CLIENT_ID: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_API_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      OPENAI_API_KEY: "",
      THAIBULKSMS_API_KEY: "",
      THAIBULKSMS_API_SECRET: "",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_FROM_NUMBER: "",
      ...overrides
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  let stopped = false;
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  async function stop() {
    if (stopped) return;
    stopped = true;
    await stopChild(child);
    await rm(dataDir, { recursive: true, force: true });
  }

  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Server exited early:\n${output}`);
      }
      try {
        const response = await fetch(`${origin}/api/health`);
        if (response.ok) {
          return {
            origin,
            dataDir,
            output: () => output,
            stop
          };
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Server did not become ready:\n${output}`);
  } catch (error) {
    await stop();
    throw error;
  }
}
