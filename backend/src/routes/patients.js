const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createPatientSchema, listPatientsSchema } = require('../validation/schemas');
const { sendSuccess, asyncHandler, notFound } = require('../lib/http');

const router = express.Router();

router.get('/', authenticate, validate(listPatientsSchema, 'query'), asyncHandler(async (req, res) => {
  const { search, gender, page, limit } = req.query;
  const skip = (page - 1) * limit;

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (gender && gender !== 'All') {
    where.gender = { equals: gender, mode: 'insensitive' };
  }

  const [patients, totalPatients] = await Promise.all([
    prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.patient.count({ where }),
  ]);

  sendSuccess(res, { patients }, {
    pagination: { page, limit, totalPatients, totalPages: Math.ceil(totalPatients / limit) },
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
    include: {
      appointments: {
        orderBy: { appointmentDate: 'desc' },
        include: { doctor: { select: { id: true, name: true, specialization: true } } },
      },
    },
  });

  if (!patient) {
    throw notFound('Patient not found');
  }
  sendSuccess(res, { patient });
}));

router.post('/', authenticate, validate(createPatientSchema), asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

  const patient = await prisma.patient.create({
    data: {
      name,
      email: email || null,
      phoneNumber,
      age,
      gender,
      medicalHistory: medicalHistory || null,
    },
  });

  sendSuccess(res, { patient }, { status: 201, message: 'Patient registered successfully' });
}));

router.delete('/:id', authenticate, authorizeAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    throw notFound('Patient not found');
  }

  await prisma.$transaction([
    prisma.queueToken.deleteMany({ where: { patientId: id } }),
    prisma.appointment.deleteMany({ where: { patientId: id } }),
    prisma.patient.delete({ where: { id } }),
  ]);

  sendSuccess(res, { id }, { message: `Successfully deleted patient ${patient.name}` });
}));

module.exports = router;
