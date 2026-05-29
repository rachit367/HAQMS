const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createAppointmentSchema, updateAppointmentSchema } = require('../validation/schemas');
const { sendSuccess, asyncHandler, conflict } = require('../lib/http');

const router = express.Router();

const SLOT_MINUTES = 30;

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { doctorId, status } = req.query;

  const where = {};
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { appointmentDate: 'asc' },
    include: {
      patient: { select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true } },
      doctor: { select: { id: true, name: true, specialization: true } },
    },
  });

  sendSuccess(res, { count: appointments.length, appointments });
}));

router.post('/', authenticate, validate(createAppointmentSchema), asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentDate, reason } = req.body;

  const slotStart = new Date(appointmentDate);
  const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60000);

  const overlap = await prisma.appointment.findFirst({
    where: {
      doctorId,
      status: { not: 'CANCELLED' },
      appointmentDate: { gte: slotStart, lt: slotEnd },
    },
  });

  if (overlap) {
    throw conflict('Doctor already has an appointment in this time slot.', 'SLOT_TAKEN');
  }

  const appointment = await prisma.appointment.create({
    data: { patientId, doctorId, appointmentDate: slotStart, reason, status: 'PENDING' },
  });

  sendSuccess(res, { appointment }, { status: 201, message: 'Appointment booked successfully' });
}));

router.patch('/:id', authenticate, validate(updateAppointmentSchema), asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  sendSuccess(res, { appointment });
}));

module.exports = router;
