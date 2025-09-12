import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function hexToHsl(hex: string) {
  const m = hex.replace('#','');
  const bigint = parseInt(m.length===3 ? m.split('').map(x=>x+x).join('') : m, 16);
  const r = (bigint >> 16) & 255, g = (bigint >> 8) & 255, b = bigint & 255;
  const rr = r/255, gg = g/255, bb = b/255;
  const max = Math.max(rr,gg,bb), min = Math.min(rr,gg,bb);
  let h=0, s=0, l=(max+min)/2;
  const d = max - min;
  if (d!==0) {
    s = d / (1 - Math.abs(2*l - 1));
    switch(max){
      case rr: h = ((gg-bb)/d + (gg<bb?6:0)); break;
      case gg: h = ((bb-rr)/d + 2); break;
      default: h = ((rr-gg)/d + 4);
    }
    h = h*60;
  }
  return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
}