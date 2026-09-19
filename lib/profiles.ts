export const AVATAR_BUCKET = "avatars";

export const ALLOWED_AVATAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_AVATAR_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const USERNAME_PATTERN = /^[a-z0-9._]+$/;

export type Profile = {
  id: string;
  username: string;
  avatar_path: string | null;
  created_at: string;
};

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const normalizedUsername = normalizeUsername(value);

  if (!normalizedUsername) {
    return "Please choose a username.";
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return "Use only lowercase letters, numbers, periods, and underscores.";
  }

  return "";
}

export function getAvatarFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function isAllowedAvatarFile(file: Pick<File, "name" | "type">) {
  const fileType = file.type.toLowerCase();
  const fileExtension = getAvatarFileExtension(file.name);

  return (
    ALLOWED_AVATAR_MIME_TYPES.includes(
      fileType as (typeof ALLOWED_AVATAR_MIME_TYPES)[number],
    ) || ALLOWED_AVATAR_EXTENSIONS.includes(fileExtension)
  );
}

export function buildAvatarPath(userId: string, fileName: string) {
  const extension = getAvatarFileExtension(fileName) || ".jpg";
  return `${userId}/avatar-${crypto.randomUUID()}${extension}`;
}
