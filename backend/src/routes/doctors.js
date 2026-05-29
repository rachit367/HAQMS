const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { listDoctorsSchema } = require('../validation/schemas');
const { sendSuccess, asyncHandler, notFound } = require('../lib/http');

const router = express.Router();

router.get('/', authenticate, validate(listDoctorsSchema, 'query'), asyncHandler(async (req, res) => {
  const { search, specialization } = req.query;

  const where = {};
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (specialization && specialization !== 'All') {
    where.specialization = specialization;
  }

  const doctors = await prisma.doctor.findMany({ where, orderBy: { name: 'asc' } });
  sendSuccess(res, { doctors });
}));

router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const [total, surgeons, averageFee, highestExperience] = await Promise.all([
    prisma.doctor.count(),
    prisma.doctor.count({ where: { department: 'Surgery' } }),
    prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
    prisma.doctor.aggregate({ _max: { experience: true } }),
  ]);

  sendSuccess(res, {
    total,
    surgeons,
    averageFee: Math.round(averageFee._avg.consultationFee || 0),
    maxExperience: highestExperience._max.experience || 0,
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { id: req.params.id } });
  if (!doctor) {
    throw notFound('Doctor not found');
  }
  sendSuccess(res, { doctor });
}));

module.exports = router;
