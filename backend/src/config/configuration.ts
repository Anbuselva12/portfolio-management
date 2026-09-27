export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  storageMode: process.env.STORAGE_MODE || 'server',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  geminiApiKey: process.env.GEMINI_API_KEY,
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'INR',
  defaultCountry: process.env.DEFAULT_COUNTRY || 'IN',
});
