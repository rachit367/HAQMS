const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { checkinSchema, updateQueueSchema } = require('../validation/schemas');
const { sendSuccess, asyncHandler } = require('../lib/http');

const router = express.Router();

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const tokenInclude = { patient: true, doctor: true };

const createTokenWithRetry = async ({ patientId, doctorId, appointmentId }, attempts = 5) => {
  const day = startOfToday();

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const max = await tx.queueToken.aggregate({
          where: { doctorId, queueDate: day },
          _max: { tokenNumber: true },
        });
        const tokenNumber = (max._max.tokenNumber || 0) + 1;

        return tx.queueToken.create({
          data: { tokenNumber, patientId, doctorId, appointmentId: appointmentId || null, queueDate: day, status: 'WAITING' },
          include: tokenInclude,
        });
      });
    } catch (error) {
      if (error.code === 'P2002' && attempt < attempts - 1) {
        continue;
      }
      throw error;
    }
  }
  return null;
};

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { doctorId, status } = req.query;

  const where = {};
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;

  const tokens = await prisma.queueToken.findMany({
    where,
    include: tokenInclude,
    orderBy: { createdAt: 'asc' },
  });

  sendSuccess(res, { tokens });
}));

router.post('/checkin', authenticate, validate(checkinSchema), asyncHandler(async (req, res) => {
  const token = await createTokenWithRetry(req.body);
  sendSuccess(res, { token }, { status: 201, message: 'Checked in successfully. Token generated.' });
}));

router.patch('/:id', authenticate, validate(updateQueueSchema), asyncHandler(async (req, res) => {
  const token = await prisma.queueToken.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
    include: tokenInclude,
  });
  sendSuccess(res, { token });
}));

module.exports = router;
