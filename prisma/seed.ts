import { PrismaClient, Role, Status, Priority, ActivityAction } from "@prisma/client";
import { hash } from "bcryptjs";
import { generateReference, generatePublicToken } from "../src/lib/ids";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hoursAfter(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding database...");

  // 1. Delete all rows in required order for clean re-runnability
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash password with bcrypt cost 10
  const passwordHash = await hash("Password123!", 10);

  // 3. Create users
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Alex Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      email: "agent1@example.com",
      name: "Sam Agent",
      role: Role.AGENT,
      passwordHash,
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      email: "agent2@example.com",
      name: "Riley Agent",
      role: Role.AGENT,
      passwordHash,
    },
  });

  console.log(`Created 3 users: ${admin.email}, ${agent1.email}, ${agent2.email}`);

  // 4. Create 10 complaints with realistic data spread over last 30 days
  const complaintSeeds = [
    // 4 x OPEN (unassigned, mixed priorities)
    {
      title: "Double billed for monthly enterprise subscription",
      description: "Our company account was charged twice on the 1st of the month for invoice INV-9812. Requesting refund for the duplicate charge.",
      category: "Billing",
      priority: Priority.HIGH,
      status: Status.OPEN,
      submitterName: "John Doe",
      submitterEmail: "john.doe@acme.corp",
      assigneeId: null,
      createdAt: daysAgo(28),
    },
    {
      title: "Package marked as delivered but not received",
      description: "Courier tracking indicates parcel was handed to resident, but security camera shows no courier arrived at the property.",
      category: "Delivery",
      priority: Priority.MEDIUM,
      status: Status.OPEN,
      submitterName: "Sarah Jenkins",
      submitterEmail: "sarah.j@example.net",
      assigneeId: null,
      createdAt: daysAgo(21),
    },
    {
      title: "Missing user manual and warranty booklet",
      description: "Hardware unit arrived in good condition but printed documentation, installation guide, and warranty card were missing from the box.",
      category: "Product",
      priority: Priority.LOW,
      status: Status.OPEN,
      submitterName: "Carlos Gomez",
      submitterEmail: "carlos.g@example.org",
      assigneeId: null,
      createdAt: daysAgo(14),
    },
    {
      title: "API endpoint returning 500 internal server error",
      description: "The reporting webhook endpoint fails intermittently with 500 error during high-throughput batch uploads.",
      category: "Service",
      priority: Priority.HIGH,
      status: Status.OPEN,
      submitterName: "Maya Patel",
      submitterEmail: "maya.patel@techsolutions.io",
      assigneeId: null,
      createdAt: daysAgo(4),
    },

    // 2 x IN_REVIEW (one assigned to agent1, one to agent2)
    {
      title: "Unauthorized charge on quarterly subscription renewal",
      description: "Account was billed for premium analytics add-on that was explicitly cancelled before the renewal cutoff date.",
      category: "Billing",
      priority: Priority.HIGH,
      status: Status.IN_REVIEW,
      submitterName: "Liam O'Connor",
      submitterEmail: "liam.oc@startup.co",
      assigneeId: agent1.id,
      createdAt: daysAgo(18),
    },
    {
      title: "Customer onboarding session delayed by over 45 minutes",
      description: "Scheduled technical onboarding session was delayed without prior notification or reschedule link provided.",
      category: "Service",
      priority: Priority.MEDIUM,
      status: Status.IN_REVIEW,
      submitterName: "Elena Rostova",
      submitterEmail: "elena.r@enterprise.com",
      assigneeId: agent2.id,
      createdAt: daysAgo(11),
    },

    // 2 x RESOLVED (assigned)
    {
      title: "Defective cooling fan on industrial network switch",
      description: "Unit began overheating immediately after installation. Replacement cooling unit was dispatched and verified functional.",
      category: "Product",
      priority: Priority.HIGH,
      status: Status.RESOLVED,
      submitterName: "Marcus Vance",
      submitterEmail: "m.vance@datacenter.net",
      assigneeId: agent1.id,
      createdAt: daysAgo(25),
    },
    {
      title: "Damaged outer shipping carton on arrival",
      description: "The exterior box was crushed during transit, though internal protective packaging kept contents intact.",
      category: "Delivery",
      priority: Priority.LOW,
      status: Status.RESOLVED,
      submitterName: "Chloe Bennett",
      submitterEmail: "chloe.b@creative.agency",
      assigneeId: agent2.id,
      createdAt: daysAgo(19),
    },

    // 1 x CLOSED (assigned)
    {
      title: "Portal login failure after credential migration",
      description: "User was unable to log in following authentication service migration. Secure password reset link was issued and confirmed working.",
      category: "Service",
      priority: Priority.MEDIUM,
      status: Status.CLOSED,
      submitterName: "David Kim",
      submitterEmail: "david.kim@logistics.com",
      assigneeId: agent1.id,
      createdAt: daysAgo(29),
    },

    // 1 x REJECTED (assigned)
    {
      title: "Request for full refund on out-of-warranty accessory",
      description: "Customer requested full reimbursement for adapter cables purchased 3 years ago; rejected per standard terms.",
      category: "Product",
      priority: Priority.LOW,
      status: Status.REJECTED,
      submitterName: "Amira Hassan",
      submitterEmail: "amira.h@webmail.org",
      assigneeId: agent2.id,
      createdAt: daysAgo(9),
    },
  ];

  for (const item of complaintSeeds) {
    const reference = generateReference();
    const publicToken = generatePublicToken();

    const complaint = await prisma.complaint.create({
      data: {
        reference,
        publicToken,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        status: item.status,
        submitterName: item.submitterName,
        submitterEmail: item.submitterEmail,
        assigneeId: item.assigneeId,
        createdAt: item.createdAt,
        updatedAt: item.status === Status.OPEN ? item.createdAt : hoursAfter(item.createdAt, 4),
      },
    });

    // Initial CREATED activity
    await prisma.activity.create({
      data: {
        complaintId: complaint.id,
        action: ActivityAction.CREATED,
        actorId: null,
        metadata: {
          reference: complaint.reference,
          category: complaint.category,
          priority: complaint.priority,
        },
        createdAt: item.createdAt,
      },
    });

    // If assigned, log ASSIGNED activity and comments
    if (item.assigneeId) {
      const assignedAt = hoursAfter(item.createdAt, 2);
      await prisma.activity.create({
        data: {
          complaintId: complaint.id,
          action: ActivityAction.ASSIGNED,
          actorId: admin.id,
          metadata: {
            assignedTo: item.assigneeId,
          },
          createdAt: assignedAt,
        },
      });

      if (item.status === Status.IN_REVIEW) {
        await prisma.comment.create({
          data: {
            complaintId: complaint.id,
            authorId: item.assigneeId,
            body: "Investigating the issue with the relevant department.",
            isInternal: true,
            createdAt: hoursAfter(assignedAt, 1),
          },
        });
      } else if (item.status === Status.RESOLVED) {
        const resolvedAt = hoursAfter(assignedAt, 3);
        await prisma.activity.create({
          data: {
            complaintId: complaint.id,
            action: ActivityAction.STATUS_CHANGED,
            actorId: item.assigneeId,
            metadata: {
              previousStatus: Status.IN_REVIEW,
              newStatus: Status.RESOLVED,
            },
            createdAt: resolvedAt,
          },
        });
        await prisma.comment.create({
          data: {
            complaintId: complaint.id,
            authorId: item.assigneeId,
            body: "Resolution confirmed and details communicated to the customer.",
            isInternal: false,
            createdAt: resolvedAt,
          },
        });
      } else if (item.status === Status.CLOSED) {
        const closedAt = hoursAfter(assignedAt, 6);
        await prisma.activity.create({
          data: {
            complaintId: complaint.id,
            action: ActivityAction.STATUS_CHANGED,
            actorId: item.assigneeId,
            metadata: {
              previousStatus: Status.RESOLVED,
              newStatus: Status.CLOSED,
            },
            createdAt: closedAt,
          },
        });
      } else if (item.status === Status.REJECTED) {
        const rejectedAt = hoursAfter(assignedAt, 2);
        await prisma.activity.create({
          data: {
            complaintId: complaint.id,
            action: ActivityAction.STATUS_CHANGED,
            actorId: item.assigneeId,
            metadata: {
              previousStatus: Status.OPEN,
              newStatus: Status.REJECTED,
              reason: "Warranty expired",
            },
            createdAt: rejectedAt,
          },
        });
        await prisma.comment.create({
          data: {
            complaintId: complaint.id,
            authorId: item.assigneeId,
            body: "Claim cannot be processed as warranty coverage has expired.",
            isInternal: false,
            createdAt: rejectedAt,
          },
        });
      }
    }
  }

  console.log("Seeding completed successfully with 10 complaints.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
