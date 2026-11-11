/** Heading text → URL fragment. Prose uses it for ids, the post page for links. */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** The `## ` headings of a markdown body, in order — for a contents list. */
export function outline(content: string) {
  return content
    .split('\n')
    .filter((line) => /^##\s+\S/.test(line))
    .map((line) => {
      const text = line
        .replace(/^##\s+/, '')
        .replace(/\]\(.*?\)/g, ']') // keep link text, drop the URL
        .replace(/[*_`[\]]/g, '')
        .trim()
      return { text, id: headingId(text) }
    })
    .filter((item) => item.id)
}
