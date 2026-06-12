const { Cache, connectDB } = require('./database');

async function clearAllCache() {
  await connectDB();
  try {
    const deletedCount = await Cache.destroy({
      where: {},
      truncate: true
    });
    console.log(`Successfully deleted all cache entries. Database is clear.`);
  } catch (err) {
    console.error('Error clearing cache:', err);
  } finally {
    process.exit(0);
  }
}

clearAllCache();
