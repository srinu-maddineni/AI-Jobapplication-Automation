const Recommendation = require('../models/Recommendation');

const getRecommendations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      minimumRecommendationScore,
      autoApplyEligible,
      remoteOnly,
      visaSponsorship,
      fresherOnly,
    } = req.query;

    const parsedPage  = Math.max(parseInt(page,  10), 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);
    const filter = { userId: req.user.id };

    if (minimumRecommendationScore) {
      filter.recommendationScore = { $gte: Number(minimumRecommendationScore) };
    }
    if (autoApplyEligible !== undefined) {
      filter.autoApplyEligible = autoApplyEligible === 'true';
    }

    const recommendations = await Recommendation.find(filter)
      .populate('jobId')
      .sort({ recommendationScore: -1, createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const total = await Recommendation.countDocuments(filter);

    return res.json({
      recommendations,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return res.status(500).json({ message: error.message || 'Unable to fetch recommendations' });
  }
};

module.exports = { getRecommendations };
