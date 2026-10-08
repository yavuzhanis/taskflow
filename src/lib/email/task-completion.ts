import { sendMail } from "@/lib/email/smtp";

type TaskCompletionEmailInput = {
  task: {
    title: string;
    description: string | null;
    priority: string;
    dueDate: Date | null;
    completedAt: Date | null;
    project: { name: string; completionEmailTo?: string | null } | null;
  };
  user: {
    name: string | null;
    email: string;
  };
};

function parseList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: Date | null) {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export async function sendTaskCompletionEmail({ task, user }: TaskCompletionEmailInput) {
  const to = parseList(task.project?.completionEmailTo || process.env.TASK_COMPLETION_EMAIL_TO);
  const subject = `TaskFlow - Görev tamamlandı: ${task.title}`;
  if (!to.length) return { skipped: true, recipients: "", subject };

  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim();
  if (!fromEmail) return { skipped: true, recipients: to.join(", "), subject };

  const fromName = process.env.SMTP_FROM_NAME?.trim() || "TaskFlow";
  const cc = parseList(process.env.TASK_COMPLETION_EMAIL_CC);
  const completedBy = user.name ? `${user.name} <${user.email}>` : user.email;

  const text = [
    "Merhaba,",
    "",
    "Aşağıdaki iş TaskFlow üzerinde tamamlandı olarak işaretlendi.",
    "",
    `Görev: ${task.title}`,
    `Tamamlayan: ${completedBy}`,
    `Proje/Birim: ${task.project?.name ?? "Belirtilmedi"}`,
    `Öncelik: ${task.priority}`,
    `Son tarih: ${formatDate(task.dueDate)}`,
    `Tamamlanma zamanı: ${formatDate(task.completedAt)}`,
    "",
    "Açıklama:",
    task.description?.trim() || "Açıklama yok.",
    "",
    "Bu e-posta TaskFlow tarafından otomatik gönderildi.",
  ].join("\n");

  return sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    cc,
    replyTo: user.email,
    subject,
    text,
  }).then((result) => ({
    ...result,
    recipients: [...to, ...cc].join(", "),
    subject,
  }));
}
