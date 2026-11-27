export function buildDashboardSummary({ products = 0, templates = 0, stickers = 0, imports = 0, recentGenerations = [], recentImports = [] } = {}) {
  const activities = [
    ...recentGenerations.map((item) => ({ type: 'generation', title: `Sticker generation · ${item.generationId}`, detail: `${item.count} sticker(s) generated`, date: item.date })),
    ...recentImports.map((item) => ({ type: 'import', title: item.sourceFile || 'Spreadsheet import', detail: `${item.status || 'processed'} · ${item.count || 0} row(s)`, date: item.date }))
  ].filter((item) => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  return { counts: { products, templates, stickers, imports }, activities };
}
