import { NextRequest } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { fail, handleRouteError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations/user";

// Public fields visible to any authenticated user
const PUBLIC_PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  status: true,
  employeeId: true,
  designation: true,
  department: true,
  employmentType: true,
  dateOfJoining: true,
  workLocation: true,
  linkedinUrl: true,
  bio: true,
  reportingManager: {
    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
  },
} as const;

// Full fields visible to admin/owner (everything except bank)
const PRIVILEGED_PROFILE_SELECT = {
  ...PUBLIC_PROFILE_SELECT,
  email: true,
  createdAt: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  maritalStatus: true,
  nationality: true,
  address: true,
  city: true,
  state: true,
  country: true,
  zipCode: true,
  reportingManagerId: true,
  emergencyContactName: true,
  emergencyContactRelation: true,
  emergencyContactPhone: true,
  bankName: true,
  bankAccountNumber: true,
  bankRoutingCode: true,
  bankHolderName: true,
} as const;

async function getCallerPrivilege(callerId: string) {
  const caller = await prisma.user.findUnique({
    where: { id: callerId },
    select: { role: true },
  });
  if (caller?.role === "admin") return "privileged" as const;

  const ownerMembership = await prisma.workspaceMember.findFirst({
    where: { userId: callerId, role: "owner" },
    select: { userId: true },
  });
  if (ownerMembership) return "privileged" as const;

  return "regular" as const;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { userId } = await params;
  const privilege = await getCallerPrivilege(auth.session.user.id);

  const selectFields = privilege === "privileged"
    ? PRIVILEGED_PROFILE_SELECT
    : PUBLIC_PROFILE_SELECT;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: selectFields,
  });

  if (!user) {
    return fail("User not found", 404);
  }

  return ok({ ...user, _accessLevel: privilege });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { userId } = await params;
  const privilege = await getCallerPrivilege(auth.session.user.id);
  if (privilege !== "privileged") {
    return fail("Forbidden", 403);
  }

  try {
    const payload = updateProfileSchema.parse(await request.json());
    const normalizedEmail = payload.email?.toLowerCase();

    if (normalizedEmail) {
      const existing = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: userId },
        },
        select: { id: true },
      });
      if (existing) {
        return fail("Email is already in use", 409);
      }
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) {
      return fail("User not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
        ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.dateOfBirth !== undefined ? { dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null } : {}),
        ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
        ...(payload.bloodGroup !== undefined ? { bloodGroup: payload.bloodGroup } : {}),
        ...(payload.maritalStatus !== undefined ? { maritalStatus: payload.maritalStatus } : {}),
        ...(payload.nationality !== undefined ? { nationality: payload.nationality } : {}),
        ...(payload.address !== undefined ? { address: payload.address } : {}),
        ...(payload.city !== undefined ? { city: payload.city } : {}),
        ...(payload.state !== undefined ? { state: payload.state } : {}),
        ...(payload.country !== undefined ? { country: payload.country } : {}),
        ...(payload.zipCode !== undefined ? { zipCode: payload.zipCode } : {}),
        ...(payload.employeeId !== undefined ? { employeeId: payload.employeeId } : {}),
        ...(payload.designation !== undefined ? { designation: payload.designation } : {}),
        ...(payload.department !== undefined ? { department: payload.department } : {}),
        ...(payload.employmentType !== undefined ? { employmentType: payload.employmentType } : {}),
        ...(payload.dateOfJoining !== undefined ? { dateOfJoining: payload.dateOfJoining ? new Date(payload.dateOfJoining) : null } : {}),
        ...(payload.reportingManagerId !== undefined ? { reportingManagerId: payload.reportingManagerId } : {}),
        ...(payload.workLocation !== undefined ? { workLocation: payload.workLocation } : {}),
        ...(payload.linkedinUrl !== undefined ? { linkedinUrl: payload.linkedinUrl } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
        ...(payload.bankName !== undefined ? { bankName: payload.bankName } : {}),
        ...(payload.bankAccountNumber !== undefined ? { bankAccountNumber: payload.bankAccountNumber } : {}),
        ...(payload.bankRoutingCode !== undefined ? { bankRoutingCode: payload.bankRoutingCode } : {}),
        ...(payload.bankHolderName !== undefined ? { bankHolderName: payload.bankHolderName } : {}),
        ...(payload.emergencyContactName !== undefined ? { emergencyContactName: payload.emergencyContactName } : {}),
        ...(payload.emergencyContactRelation !== undefined ? { emergencyContactRelation: payload.emergencyContactRelation } : {}),
        ...(payload.emergencyContactPhone !== undefined ? { emergencyContactPhone: payload.emergencyContactPhone } : {}),
      },
      select: PRIVILEGED_PROFILE_SELECT,
    });

    return ok(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}
