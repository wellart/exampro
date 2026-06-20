/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Decrypt questions on the fly from reversed Base64
export function decryptText(text: string): string {
  if (!text) return "";
  try {
    const reversed = text.split("").reverse().join("");
    // Handle UTF-8 safely in browser
    return decodeURIComponent(
      atob(reversed)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (err) {
    try {
      const reversed = text.split("").reverse().join("");
      return atob(reversed);
    } catch {
      return text;
    }
  }
}

// Convert Date string to localized Indonesian string format
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

// Helper to safely parse CSV in pure TS
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse headers
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Direct split might break on commas inside quotes, so we split with a refined regex for quoting compliance
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
    const obj: Record<string, string> = {};

    headers.forEach((header, index) => {
      let val = matches[index] || "";
      val = val.trim().replace(/^"|"$/g, ""); // strip outer quotes
      obj[header] = val;
    });

    results.push(obj);
  }

  return results;
}
