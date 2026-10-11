import mongoose from 'mongoose';
import dns from 'node:dns';


export const connectDB = async () => {
  if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || 'cura'
    });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};
