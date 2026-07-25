import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora", {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Surfacing drops/recoveries here means an intermittent-login report can be
    // diagnosed from the server log instead of guessed at.
    mongoose.connection.on("disconnected", () => {
      console.error("⚠️  MongoDB disconnected — auth requests will fail until it reconnects.");
    });
    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected.");
    });
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`💡 FIX: Your local MongoDB service is stopped. Open Command Prompt / PowerShell as Administrator and run:`);
    console.error(`   net start MongoDB`);
    console.error(`   (Or start the 'MongoDB Server' service from Windows Services app / taskmgr).`);
  }
};

export default connectDB;
