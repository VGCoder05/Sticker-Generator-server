
import mongoose from 'mongoose';
import Product from '../models/Product.js';

let connectionPromise = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Configure it in Vercel Environment Variables.');
  }

  // Reuse an existing connection.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Prevent multiple simultaneous connection attempts.
  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 10000,
        });

        // Ensure the Product collection exists.
        const collections = await mongoose.connection.db
          .listCollections({
            name: Product.collection.collectionName,
          })
          .toArray();

        if (!collections.length) {
          await Product.createCollection();
        }

        // Handle the legacy sparse unique index.
        const indexes = await Product.collection.indexes();

        const legacyCodeIndex = indexes.find(
          (index) =>
            index.name === 'productCode_1' &&
            index.unique &&
            index.sparse
        );

        if (legacyCodeIndex) {
          await Product.collection.dropIndex('productCode_1');
        }

        await Product.createIndexes();

        console.log(
          `MongoDB connected: ${mongoose.connection.name}`
        );

        return mongoose.connection;
      } catch (error) {
        connectionPromise = null;

        console.error('MongoDB connection failed:', error.message);

        throw error;
      }
    })();
  }

  return connectionPromise;
}
