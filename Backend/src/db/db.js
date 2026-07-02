import { setServers } from "node:dns/promises";
setServers(["1.1.1.1", "8.8.8.8"]);
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB);
    console.log(`MongoDB Connected !!`);
  } catch (error) {
    console.error("DB Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
