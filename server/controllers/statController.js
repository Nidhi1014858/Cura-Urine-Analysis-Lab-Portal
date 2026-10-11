import Test from '../models/Test.js';
import { Patient } from '../models/Patient.js';

function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export async function getDashboardStats(req, res, next) {
  try {
    const today = todayIST();
    const start = new Date(`${today}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const [
      totalTestsCount,
      todayTestsCount,
      pendingReviewsCount,
      abnormalCount,
      totalPatientsCount,
      recentTests,
      pendingReviewQueue
    ] = await Promise.all([
      Test.countDocuments(),
      Test.countDocuments({ submittedAt: { $gte: start, $lt: end } }),
      Test.countDocuments({ 'clinicianReview.status': 'pending' }),
      Test.countDocuments({ overallStatus: 'abnormal' }),
      Patient.countDocuments(),
      Test.find().sort({ submittedAt: -1 }).limit(5),
      Test.find({ 'clinicianReview.status': 'pending' }).sort({ overallStatus: 1, submittedAt: -1 })
    ]);

    pendingReviewQueue.sort((a, b) => {
      if (a.overallStatus === 'abnormal' && b.overallStatus !== 'abnormal') return -1;
      if (a.overallStatus !== 'abnormal' && b.overallStatus === 'abnormal') return 1;
      return new Date(b.submittedAt) - new Date(a.submittedAt);
    });

    res.json({
      totalTestsCount,
      todayTestsCount,
      pendingReviewsCount,
      abnormalCount,
      totalPatientsCount,
      recentTests,
      pendingReviewQueue
    });
  } catch (error) {
    next(error);
  }
};
