import { cn } from "@/utils/cn";
import { initials } from "@/utils/formatters";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-xl",
};

export function Avatar({ src, name, size = "md", online, className }: AvatarProps) {
  let imageUrl = src;
  if (imageUrl && imageUrl.startsWith("/uploads/")) {
    imageUrl = `http://localhost:5000${imageUrl}`;
  }

  return (
    <span className={cn("relative inline-block shrink-0", sizeMap[size], className)}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full rounded-full object-cover ring-2 ring-white"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-2 ring-white">
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
            size === "xl" ? "h-4 w-4" : "h-2.5 w-2.5",
            online ? "bg-success" : "bg-ink-300"
          )}
        />
      )}
    </span>
  );
}
