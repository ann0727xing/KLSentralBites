/** Display hashtag without #: e.g. "KLSentralBites Café" -> "KLSentralBitesCafe" */
export function nameToHashtag(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}
