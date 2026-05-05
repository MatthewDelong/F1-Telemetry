const { Cache, connectDB } = require('./database');
const { Op } = require('sequelize');

async function clearF2Cache() {
  await connectDB();
  const deletedCount = await Cache.destroy({
    where: {
      key: {
        [Op.like]: 'f2:%'
      }
    }
  });
  console.log(`Deleted ${deletedCount} cache entries for F2.`);
  process.exit(0);
}

clearF2Cache();
