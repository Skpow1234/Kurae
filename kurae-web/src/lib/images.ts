/** Skip Next.js image optimization for data URLs and direct S3 object URLs. */
export function shouldUnoptimizeImageSrc(url: string): boolean {
  return url.startsWith("data:") || url.includes(".amazonaws.com/");
}
