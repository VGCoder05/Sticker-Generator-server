const clean = (value) => String(value ?? '').trim();
const normalized = (value) => clean(value).toLocaleLowerCase().replace(/\s+/g, ' ');

export function findProductMatch(record, products) {
  const code = normalized(record.productCode);
  if (code) {
    const match = products.find((product) => normalized(product.productCode) === code);
    if (match) return { product: match, method: 'productCode' };
  }
  const name = normalized(record.productName ?? record.name);
  const brand = normalized(record.brand);
  if (!name) return { product: null, method: null };
  const matches = products.filter((product) => {
    if (normalized(product.name) !== name) return false;
    const existingBrand = normalized(product.fields?.brand);
    return brand ? existingBrand === brand : !existingBrand;
  });
  return matches.length === 1 ? { product: matches[0], method: 'nameAndBrand' } : { product: null, method: matches.length > 1 ? 'ambiguous' : null };
}

export function buildProductFields(record) {
  const { productName, productCode, _sourceRows, ...fields } = record;
  return { name: clean(productName), productCode: clean(productCode), fields };
}
