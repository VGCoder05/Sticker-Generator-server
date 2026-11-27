import mongoose from 'mongoose';
import Product from '../models/Product.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Add it to your .env file.');

  await mongoose.connect(uri);
  // Ensure the collection exists before inspecting indexes on a fresh database.
  const collections = await mongoose.connection.db.listCollections({ name: Product.collection.collectionName }).toArray();
  if (!collections.length) await Product.createCollection();
  // Replace the earlier sparse unique index: empty strings are indexed by sparse indexes too.
  const indexes = await Product.collection.indexes();
  const legacyCodeIndex = indexes.find((index) => index.name === 'productCode_1' && index.unique && index.sparse);
  if (legacyCodeIndex) await Product.collection.dropIndex('productCode_1');
  await Product.createIndexes();
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}
