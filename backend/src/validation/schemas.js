const { z } = require('zod');

const email = z.string().trim().toLowerCase().email('Invalid email format');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number');
const phoneNumber = z.string().trim().regex(/^\+?[0-9][0-9\s\-().]{5,19}$/, 'Invalid phone number format');

const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1, 'Name is required'),
}).strict('Only email, password and name are allowed');

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

const createPatientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: email.optional().or(z.literal('').transform(() => undefined)),
  phoneNumber,
  age: z.coerce.number().int().min(0).max(150),
  gender: z.enum(['Male', 'Female', 'Other']),
  medicalHistory: z.string().trim().optional().nullable(),
});

const listPatientsSchema = z.object({
  search: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(5),
});

const listDoctorsSchema = z.object({
  search: z.string().trim().optional(),
  specialization: z.string().trim().optional(),
});

const createAppointmentSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  doctorId: z.string().uuid('Invalid doctor id'),
  appointmentDate: z.coerce.date(),
  reason: z.string().trim().optional().default(''),
});

const updateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
});

const checkinSchema = z.object({
  patientId: z.string().uuid('Invalid patient id'),
  doctorId: z.string().uuid('Invalid doctor id'),
  appointmentId: z.string().uuid().optional().nullable(),
});

const updateQueueSchema = z.object({
  status: z.enum(['WAITING', 'CALLING', 'COMPLETED', 'SKIPPED']),
});

module.exports = {
  registerSchema,
  loginSchema,
  createPatientSchema,
  listPatientsSchema,
  listDoctorsSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  checkinSchema,
  updateQueueSchema,
};
