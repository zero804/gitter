import slugify from 'gitter-web-slugify';

export default function parseTag(tag) {
  const slug = slugify(tag);
  return {
    name: tag,
    value: slug,
  }
}
