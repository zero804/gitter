export default function parseTag(tag) {
  var slug = tag.replace(/\s/g, '-').toLowerCase();
  return {
    name: tag,
    value: slug,
  }
}
