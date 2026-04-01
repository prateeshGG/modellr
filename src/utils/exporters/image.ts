import { toPng, toSvg } from 'html-to-image';

export async function exportImage(format: 'png' | 'svg'): Promise<void> {
  const canvas = document.querySelector('.react-flow__renderer') as HTMLElement;
  if (!canvas) throw new Error('Canvas not found');

  const dataUrl = format === 'png'
    ? await toPng(canvas, { pixelRatio: 2, cacheBust: true })
    : await toSvg(canvas, { cacheBust: true });

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `schema.${format}`;
  link.click();
}
