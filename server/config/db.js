import mongoose from 'mongoose';
import dns from 'node:dns';


export const connectDB = async () => {
  if (process.env.DNS_SERVERS) dns.setServers(process.env.DNS_SERVERS.split(','));
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};
