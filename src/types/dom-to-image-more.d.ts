declare module "dom-to-image-more" {
export function toPng(
  node: HTMLElement,
  options?: {
    filter?: (node: HTMLElement) => boolean;
    bgcolor?: string;
    width?: number;
    height?: number;
    quality?: number;
    cacheBust?: boolean;
    style?: Record<string, string | number>;
    imagePlaceholder?: string;
  },
): Promise<string>;
}
