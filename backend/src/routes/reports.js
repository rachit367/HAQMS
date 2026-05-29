const express = require('express');

const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { sendSuccess, asyncHandler } = require('../lib/http');

const router = express.Router();

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const indexByDoctor = (rows) => {
  const map = new Map();
  for (const row of rows) {
    map.set(row.doctorId, row._count._all);
  }
  return map;
};

router.get('/doctor-stats', authenticate, authorize('ADMIN', 'RECEPTIONIST'), asyncHandler(async (req, res) => {
  const today = startOfToday();

  const [doctors, totalByDoctor, completedByDoctor, cancelledByDoctor, queueByDoctor] = await Promise.all([
    prisma.doctor.findMany(),
    prisma.appointment.groupBy({ by: ['doctorId'], _count: { _all: true } }),
    prisma.appointment.groupBy({ by: ['doctorId'], where: { status: 'COMPLETED' }, _count: { _all: true } }),
    prisma.appointment.groupBy({ by: ['doctorId'], where: { status: 'CANCELLED' }, _count: { _all: true } }),
    prisma.queueToken.groupBy({ by: ['doctorId'], where: { queueDate: today }, _count: { _all: true } }),
  ]);

  const totals = indexByDoctor(totalByDoctor);
  const completed = indexByDoctor(completedByDoctor);
  const cancelled = indexByDoctor(cancelledByDoctor);
  const queue = indexByDoctor(queueByDoctor);

  const data = doctors.map((doc) => {
    const completedCount = completed.get(doc.id) || 0;
    return {
      id: doc.id,
      name: doc.name,
      specialization: doc.specialization,
      department: doc.department,
      totalAppointments: totals.get(doc.id) || 0,
      completedAppointments: completedCount,
      cancelledAppointments: cancelled.get(doc.id) || 0,
      todayQueueSize: queue.get(doc.id) || 0,
      revenue: completedCount * doc.consultationFee,
    };
  });

  sendSuccess(res, { report: data });
}));

module.exports = router;
