// Parses "[List Name]" / "[List Name: value]" tags out of free-text notes.
// A recognized tag is removed from the returned text - callers are expected
// to persist only the cleaned text and apply the tags elsewhere (as list
// membership), so a tag fires once instead of re-triggering on every save.
export type ParsedTag = {
  name: string;
  value: string | null;
};

const TAG_PATTERN = /\[([^[\]:]+)(?::\s*([^[\]]+))?\]/g;

export function extractNoteTags(text: string): { tags: ParsedTag[]; cleanedText: string } {
  const tags: ParsedTag[] = [];

  const withoutTags = text.replace(TAG_PATTERN, (_match, name: string, value: string | undefined) => {
    const trimmedName = name.trim();
    if (!trimmedName) return "";
    tags.push({ name: trimmedName, value: value ? value.trim() : null });
    return "";
  });

  const cleanedText = withoutTags
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { tags, cleanedText };
}

// Inverse of extractNoteTags - formats tags back into the same bracket
// syntax so they can be copied from one game's notes and pasted onto
// another's.
export function formatNoteTags(tags: { name: string; value: string | null }[]): string {
  return tags.map((tag) => (tag.value ? `[${tag.name}: ${tag.value}]` : `[${tag.name}]`)).join(" ");
}
