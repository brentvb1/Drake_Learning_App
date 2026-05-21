module.exports = (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.status(200).json({
    hasKey: !!key,
    keyPrefix: key ? key.slice(0, 10) + '...' : null,
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
};
