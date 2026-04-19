export function MascotIcon({
  className = "",
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Ушки */}
      <path d="M14 22 L18 8 L28 18 Z" fill="currentColor" />
      <path d="M50 22 L46 8 L36 18 Z" fill="currentColor" />
      {/* Мордочка */}
      <circle cx="32" cy="34" r="18" fill="currentColor" />
      {/* Очки — кружки */}
      <circle cx="24" cy="32" r="5" fill="none" stroke="#061739" strokeWidth="1.5" />
      <circle cx="40" cy="32" r="5" fill="none" stroke="#061739" strokeWidth="1.5" />
      <line x1="29" y1="32" x2="35" y2="32" stroke="#061739" strokeWidth="1.5" />
      {/* Глаза внутри очков */}
      <circle cx="24" cy="32" r="1.5" fill="#061739" />
      <circle cx="40" cy="32" r="1.5" fill="#061739" />
      {/* Носик */}
      <path d="M30 38 L32 40 L34 38 Z" fill="#061739" />
      {/* Усы */}
      <line x1="14" y1="40" x2="24" y2="41" stroke="#061739" strokeWidth="0.8" />
      <line x1="14" y1="44" x2="24" y2="43" stroke="#061739" strokeWidth="0.8" />
      <line x1="50" y1="40" x2="40" y2="41" stroke="#061739" strokeWidth="0.8" />
      <line x1="50" y1="44" x2="40" y2="43" stroke="#061739" strokeWidth="0.8" />
    </svg>
  );
}
