import fs from "node:fs";

const schema = fs.readFileSync(
  new URL("../prisma/schema.prisma", import.meta.url),
  "utf8",
);

const tenantModels = [
  "Project",
  "Tag",
  "Task",
  "Subtask",
  "TaskComment",
  "TaskTag",
  "TaskAttachment",
  "MailDelivery",
  "Notification",
  "ActivityLog",
];

const missing = tenantModels.filter((model) => {
  const match = schema.match(
    new RegExp(`model\\s+${model}\\s+\\{([\\s\\S]*?)\\n\\}`, "m"),
  );

  return !match || !/\buserId\s+String\b/.test(match[1]);
});

if (missing.length) {
  console.error(`Missing userId tenant key: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(
  `Tenant isolation schema check passed for ${tenantModels.length} models.`,
);
