
export default function parseCategoryForSelect(c) {
  return {
   selected: c.active,
   label: c.label || c.category,
   value: c.id
  };
}
