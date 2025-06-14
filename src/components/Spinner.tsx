'use client';

interface SpinnerProps {
  width?: string;
  height?: string;
}

export default function Spinner({ width = "4", height = "4" }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <div className={`w-${width} h-${height} border-4 border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
    </div>
  );
} 