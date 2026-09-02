import React from "react";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  shape?: "circle" | "square";
}

export function UserAvatar({
  name = "User",
  avatarUrl,
  size = "sm",
  className = "",
  shape = "circle"
}: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  const sizeClasses = {
    xs: "h-5 w-5 text-[8px]",
    sm: "h-7 w-7 text-[10px]",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm",
    xl: "h-14 w-14 text-base"
  }[size];

  const roundedClass = shape === "circle" ? "rounded-full" : "rounded";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden font-black uppercase select-none border border-[#222222] bg-[#181818] text-[#c8ff00] ${sizeClasses} ${roundedClass} ${className}`}
      title={name}
    >
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
