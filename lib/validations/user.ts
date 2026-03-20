import { z } from "zod";

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),

  // Personal
  phone: z.string().max(20).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional().nullable(),
  bloodGroup: z.string().max(5).optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "prefer_not_to_say"]).optional().nullable(),
  nationality: z.string().max(60).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),

  // Employment
  employeeId: z.string().max(30).optional().nullable(),
  designation: z.string().max(150).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern", "freelance"]).optional().nullable(),
  dateOfJoining: z.string().optional().nullable(),
  reportingManagerId: z.string().uuid().optional().nullable(),
  workLocation: z.string().max(150).optional().nullable(),
  linkedinUrl: z.string().max(300).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),

  // Bank
  bankName: z.string().max(150).optional().nullable(),
  bankAccountNumber: z.string().max(40).optional().nullable(),
  bankRoutingCode: z.string().max(30).optional().nullable(),
  bankHolderName: z.string().max(150).optional().nullable(),

  // Emergency Contact
  emergencyContactName: z.string().max(150).optional().nullable(),
  emergencyContactRelation: z.string().max(50).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

