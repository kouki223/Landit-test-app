// Runs before modules are imported so NEXT_PUBLIC_* env vars are available
// when component modules read them at load time.
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4000';
