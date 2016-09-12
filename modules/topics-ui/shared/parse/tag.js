import slugify from 'gitter-web-slugify';

export default function parseTag(tag) {
  const slug = slugify(tag);
  return {
    label: tag,
    value: slug,
  }
}
