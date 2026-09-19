type ProfileAvatarProps = {
  username: string;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
};

export function ProfileAvatar({
  username,
  avatarUrl,
  className = "h-14 w-14",
  textClassName = "text-lg",
}: ProfileAvatarProps) {
  const fallbackLabel = username.slice(0, 1).toUpperCase() || "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`${username} avatar`}
        className={`${className} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white/10 font-semibold text-white ${className} ${textClassName}`}
      aria-label={`${username} avatar placeholder`}
    >
      {fallbackLabel}
    </div>
  );
}
