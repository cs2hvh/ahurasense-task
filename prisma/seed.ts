import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Admin123456!", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      role: "admin",
      status: "active",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      name: "ACME Workspace",
      slug: "acme",
      description: "Seed workspace",
      ownerId: user.id,
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    },
  });

  const project = await prisma.project.upsert({
    where: { key: "CORE" },
    update: {},
    create: {
      workspaceId: workspace.id,
      key: "CORE",
      name: "Core Platform",
      description: "Seed project",
      leadId: user.id,
      type: "software",
      status: "active",
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      role: "lead",
    },
  });

  const statuses = [
    { name: "Backlog", category: "todo" as const, color: "#6B6B73", position: 0 },
    { name: "Selected", category: "todo" as const, color: "#A0A0A6", position: 1 },
    { name: "In Progress", category: "in_progress" as const, color: "#0066FF", position: 2 },
    { name: "In Review", category: "in_progress" as const, color: "#FF991F", position: 3 },
    { name: "QA", category: "in_progress" as const, color: "#0052CC", position: 4 },
    { name: "Done", category: "done" as const, color: "#00875A", position: 5 },
  ];

  for (const status of statuses) {
    await prisma.issueStatus.upsert({
      where: {
        projectId_name: {
          projectId: project.id,
          name: status.name,
        },
      },
      update: {
        category: status.category,
        color: status.color,
        position: status.position,
      },
      create: {
        projectId: project.id,
        name: status.name,
        category: status.category,
        color: status.color,
        position: status.position,
      },
    });
  }

  const backlogStatus = await prisma.issueStatus.findFirst({
    where: {
      projectId: project.id,
      name: "Backlog",
    },
    select: { id: true },
  });

  const legacyTodoStatus = await prisma.issueStatus.findFirst({
    where: {
      projectId: project.id,
      name: "To Do",
    },
    select: { id: true },
  });

  if (backlogStatus && legacyTodoStatus) {
    await prisma.issue.updateMany({
      where: {
        projectId: project.id,
        statusId: legacyTodoStatus.id,
      },
      data: {
        statusId: backlogStatus.id,
      },
    });

    await prisma.issueStatus.delete({
      where: {
        id: legacyTodoStatus.id,
      },
    });
  }

  const todoStatus = await prisma.issueStatus.findFirstOrThrow({
    where: {
      projectId: project.id,
      category: "todo",
    },
    orderBy: { position: "asc" },
  });

  const existing = await prisma.issue.findFirst({
    where: {
      projectId: project.id,
      issueNumber: 1,
    },
  });

  if (!existing) {
    await prisma.issue.create({
      data: {
        projectId: project.id,
        issueNumber: 1,
        key: `${project.key}-1`,
        type: "story",
        title: "Bootstrap enterprise kanban workspace",
        description: "Seed issue to validate board rendering and movement.",
        statusId: todoStatus.id,
        priority: "high",
        reporterId: user.id,
        assigneeId: user.id,
        position: 0,
      },
    });
  }

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

