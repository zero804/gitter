
export default function parseCategory(c, activeCategoryConstant) {
  const categoryValue = c.category || c.slug;

  return {
    id: c.id,
    label: c.label || c.name || c.category,
    category: categoryValue,
    active: categoryValue === activeCategoryConstant,
    slug: c.slug,
  };
}
