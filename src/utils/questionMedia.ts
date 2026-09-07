/**
 * Utility functions for parsing, extracting, and rendering image media in questions.
 * Supports Supabase Storage URLs, standard image extensions, Markdown image syntax, and custom tags.
 */

export interface ExtractedQuestionMedia {
  imageUrls: string[];
  primaryImageUrl?: string;
  cleanStatement: string;
  hasImages: boolean;
}

/**
 * Checks if a given string is or looks like a valid direct image URL
 */
export function isLikelyImageUrl(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();

  // Supabase Storage object URL
  if (/^https?:\/\/[a-zA-Z0-9_-]+\.supabase\.(?:co|in)\/storage\/v1\/object\/(?:public|sign)\//i.test(trimmed)) {
    return true;
  }

  // Standard image extensions
  if (/^https?:\/\/[^\s"']+\.(?:png|jpe?g|webp|gif|svg|bmp|avif)(?:\?[^\s"']*)?$/i.test(trimmed)) {
    return true;
  }

  // Base64 data image
  if (/^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Strips unnecessary trailing punctuation from an extracted URL
 */
function cleanUrl(rawUrl: string): string {
  let u = rawUrl.trim();
  // Strip trailing punctuation if unbalanced
  while (/[.,;:!?]$/.test(u)) {
    u = u.slice(0, -1);
  }
  return u;
}

/**
 * Extracts all image URLs from a question's statement and explicit imageUrl,
 * returning both the cleaned text (with raw URLs removed) and the list of images.
 */
export function extractQuestionMedia(
  rawStatement: string = '',
  explicitImageUrl?: string
): ExtractedQuestionMedia {
  const imageUrls: string[] = [];

  // If explicit imageUrl is already provided
  if (explicitImageUrl && explicitImageUrl.trim()) {
    const cleanedExplicit = cleanUrl(explicitImageUrl);
    if (!imageUrls.includes(cleanedExplicit)) {
      imageUrls.push(cleanedExplicit);
    }
  }

  if (!rawStatement || typeof rawStatement !== 'string') {
    return {
      imageUrls,
      primaryImageUrl: imageUrls[0],
      cleanStatement: '',
      hasImages: imageUrls.length > 0,
    };
  }

  let text = rawStatement;

  // 1. Markdown syntax: ![alt](url)
  const markdownRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = markdownRegex.exec(rawStatement)) !== null) {
    const url = cleanUrl(match[2]);
    if (url && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }
  text = text.replace(markdownRegex, '');

  // 2. Custom tag syntax: [imagem: url] or [img: url]
  const tagRegex = /\[(?:imagem|img|image):\s*(https?:\/\/[^\s\]]+)\]/gi;
  while ((match = tagRegex.exec(rawStatement)) !== null) {
    const url = cleanUrl(match[1]);
    if (url && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }
  text = text.replace(tagRegex, '');

  // 3. Supabase Storage URLs (public or sign)
  const supabaseStorageRegex = /(https?:\/\/[a-zA-Z0-9_-]+\.supabase\.(?:co|in)\/storage\/v1\/object\/(?:public|sign)\/[^\s"'\<\>]+)/gi;
  while ((match = supabaseStorageRegex.exec(rawStatement)) !== null) {
    const url = cleanUrl(match[1]);
    if (url && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }
  text = text.replace(supabaseStorageRegex, '');

  // 4. Any other raw URLs ending with typical image extensions (.png, .jpg, .jpeg, .webp, .svg, .gif)
  const genericImageRegex = /(https?:\/\/[^\s"'\<\>]+\.(?:png|jpe?g|webp|gif|svg|bmp|avif)(?:\?[^\s"'\<\>]*)?)/gi;
  while ((match = genericImageRegex.exec(text)) !== null) {
    const url = cleanUrl(match[1]);
    if (url && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }
  text = text.replace(genericImageRegex, '');

  // 5. Clean up remaining statement text (collapse multiple newlines, trim spaces)
  let cleanStatement = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();

  // If the statement was purely the image URL and no other text was provided:
  if (!cleanStatement && imageUrls.length > 0) {
    cleanStatement = 'Analise a imagem acima e responda à pergunta:';
  }

  return {
    imageUrls,
    primaryImageUrl: imageUrls[0],
    cleanStatement: cleanStatement || rawStatement,
    hasImages: imageUrls.length > 0,
  };
}

/**
 * Checks if an option text is or contains an image URL
 */
export function extractOptionMedia(optionText: string): { imageUrl?: string; cleanText: string } {
  if (!optionText) return { cleanText: '' };
  const media = extractQuestionMedia(optionText);
  if (media.hasImages && media.primaryImageUrl) {
    return {
      imageUrl: media.primaryImageUrl,
      cleanText: media.cleanStatement === 'Analise a imagem acima e responda à pergunta:' ? '' : media.cleanStatement,
    };
  }
  return { cleanText: optionText };
}
