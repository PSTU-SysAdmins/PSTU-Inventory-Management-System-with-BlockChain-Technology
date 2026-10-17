import mongoose from 'mongoose';

const connectDB = async () => {
    const uri = process.env.MONGO_URI?.trim();
    if (!uri) {
        throw new Error('MONGO_URI is required. Set it in the deployment environment or backend/.env.');
    }
    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected');
    } catch {
        // Driver errors can contain the connection URI and its credentials.
        throw new Error('MongoDB connection failed. Check MONGO_URI, database credentials, and network access.');
    }
};

export default connectDB;
