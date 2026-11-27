import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required to run this migration.');
try {
  await mongoose.connect(uri);
  const collection = mongoose.connection.collection('productvariants');
  const indexes = await collection.indexes();
  if (indexes.some((index) => index.name === 'product_mrp_batch_unique')) {
    await collection.dropIndex('product_mrp_batch_unique');
    console.log('Dropped product_mrp_batch_unique. Variants with identical or missing details can now be kept separately.');
  } else console.log('No legacy product_mrp_batch_unique index found; no change needed.');
} finally { await mongoose.disconnect(); }
