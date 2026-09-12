import Image from "next/image";
import clsx from "clsx";

interface BrandLogoProps {
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BrandLogo({
  theme = "dark",
  size = "md",
  className,
}: BrandLogoProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center leading-none",
        className,
      )}
      aria-label="FeelsOdd"
    >
      <Image
        src="/logo.png"
        alt="FeelsOdd"
        width={2172}
        height={724}
        priority
        className={clsx(
          "h-auto w-auto object-contain",
          size === "sm" && "max-h-6 max-w-[7.25rem]",
          size === "md" && "max-h-8 max-w-[9.75rem]",
          size === "lg" && "max-h-11 max-w-[13.25rem]",
          theme === "light" && "brightness-0 invert",
        )}
      />
    </span>
  );
}
