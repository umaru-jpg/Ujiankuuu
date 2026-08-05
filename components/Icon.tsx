interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

/**
 * Material Symbols Outlined icon wrapper.
 * Usage: <Icon name="dashboard" filled size={20} className="text-primary" />
 */
export default function Icon({ name, filled = false, size = 20, className = "" }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined inline-flex items-center justify-center ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
