import net from "node:net";
import tls from "node:tls";

type Socket = net.Socket | tls.TLSSocket;

type SendMailInput = {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  replyTo?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  startTls: boolean;
  user?: string;
  pass?: string;
  timeoutMs: number;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT || "587");
  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.SMTP_SECURE === "true",
    startTls: process.env.SMTP_STARTTLS !== "false",
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASSWORD || undefined,
    timeoutMs: Number(process.env.SMTP_TIMEOUT_MS || "10000"),
  };
}

function encodeHeader(value: string) {
  return /^[\x00-\x7F]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function formatAddress(address: string) {
  const trimmed = address.trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (!match) return trimmed;

  const name = match[1]?.trim().replace(/^"|"$/g, "");
  const email = match[2]?.trim();
  return name ? `${encodeHeader(name)} <${email}>` : email;
}

function escapeData(text: string) {
  return text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function createMessage({ from, to, cc = [], subject, text, replyTo }: SendMailInput) {
  const headers = [
    `From: ${formatAddress(from)}`,
    `To: ${to.map(formatAddress).join(", ")}`,
    ...(cc.length ? [`Cc: ${cc.map(formatAddress).join(", ")}`] : []),
    ...(replyTo ? [`Reply-To: ${formatAddress(replyTo)}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];

  return `${headers.join("\r\n")}\r\n\r\n${text}`;
}

function parseCompleteResponse(buffer: string) {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n").filter(Boolean);
  if (!lines.length) return null;

  const firstCode = lines[0]?.match(/^(\d{3})/)?.[1];
  if (!firstCode) return null;

  const finalLineIndex = lines.findIndex((line) => line.startsWith(`${firstCode} `));
  if (finalLineIndex === -1) return null;

  const consumed = `${lines.slice(0, finalLineIndex + 1).join("\r\n")}\r\n`;
  return {
    code: Number(firstCode),
    message: lines.slice(0, finalLineIndex + 1).join("\n"),
    consumedLength: consumed.length,
  };
}

function connect(config: SmtpConfig): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = config.secure
      ? tls.connect({ host: config.host, port: config.port, servername: config.host })
      : net.connect({ host: config.host, port: config.port });

    socket.setTimeout(config.timeoutMs);
    if (config.secure) {
      socket.once("secureConnect", () => resolve(socket));
    } else {
      socket.once("connect", () => resolve(socket));
    }
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP connection timed out"));
    });
  });
}

export async function sendMail(input: SendMailInput) {
  const config = getSmtpConfig();
  if (!config) return { skipped: true };

  let socket = await connect(config);
  let buffer = "";

  const cleanup = () => {
    socket.removeAllListeners("data");
    socket.removeAllListeners("error");
    socket.removeAllListeners("timeout");
  };

  const readResponse = () =>
    new Promise<{ code: number; message: string }>((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        const parsed = parseCompleteResponse(buffer);
        if (!parsed) return;

        buffer = buffer.slice(parsed.consumedLength);
        socket.off("data", onData);
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
        resolve({ code: parsed.code, message: parsed.message });
      };
      const onError = (error: Error) => {
        socket.off("data", onData);
        socket.off("timeout", onTimeout);
        reject(error);
      };
      const onTimeout = () => {
        socket.off("data", onData);
        socket.off("error", onError);
        reject(new Error("SMTP response timed out"));
      };

      socket.on("data", onData);
      socket.once("error", onError);
      socket.once("timeout", onTimeout);

      const parsed = parseCompleteResponse(buffer);
      if (parsed) {
        buffer = buffer.slice(parsed.consumedLength);
        socket.off("data", onData);
        socket.off("error", onError);
        socket.off("timeout", onTimeout);
        resolve({ code: parsed.code, message: parsed.message });
      }
    });

  const command = async (line: string, expectedCodes: number[]) => {
    socket.write(`${line}\r\n`);
    const response = await readResponse();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP command failed (${response.code}): ${response.message}`);
    }
    return response;
  };

  try {
    const greeting = await readResponse();
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed (${greeting.code}): ${greeting.message}`);
    }

    await command(`EHLO ${process.env.SMTP_EHLO_DOMAIN || "taskflow.local"}`, [250]);

    if (!config.secure && config.startTls) {
      await command("STARTTLS", [220]);
      cleanup();
      socket = tls.connect({ socket, servername: config.host });
      buffer = "";
      socket.setTimeout(config.timeoutMs);
      await new Promise<void>((resolve, reject) => {
        socket.once("secureConnect", () => resolve());
        socket.once("error", reject);
      });
      await command(`EHLO ${process.env.SMTP_EHLO_DOMAIN || "taskflow.local"}`, [250]);
    }

    if (config.user && config.pass) {
      await command("AUTH LOGIN", [334]);
      await command(Buffer.from(config.user).toString("base64"), [334]);
      await command(Buffer.from(config.pass).toString("base64"), [235]);
    }

    const fromEmail = input.from.match(/<([^>]+)>/)?.[1] ?? input.from;
    await command(`MAIL FROM:<${fromEmail.trim()}>`, [250]);

    const recipients = [...input.to, ...(input.cc ?? [])];
    for (const recipient of recipients) {
      await command(`RCPT TO:<${recipient.trim()}>`, [250, 251]);
    }

    await command("DATA", [354]);
    socket.write(`${escapeData(createMessage(input))}\r\n.\r\n`);
    const dataResponse = await readResponse();
    if (dataResponse.code !== 250) {
      throw new Error(`SMTP DATA failed (${dataResponse.code}): ${dataResponse.message}`);
    }

    await command("QUIT", [221]);
    return { skipped: false };
  } finally {
    cleanup();
    socket.end();
  }
}
