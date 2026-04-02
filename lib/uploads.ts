import type { ContentType } from "@/lib/repositories";

export const STORAGE_BUCKET = "repository-items";

type UploadDefinition = {
  type: Exclude<ContentType, "Hyperlink">;
  accept: string[];
  mimeTypes: string[];
  extensions: string[];
  label: string;
};

const UPLOAD_DEFINITIONS: UploadDefinition[] = [
  {
    type: "JPG",
    accept: [".jpg", ".jpeg", "image/jpeg"],
    mimeTypes: ["image/jpeg"],
    extensions: [".jpg", ".jpeg"],
    label: "JPG",
  },
  {
    type: "PNG",
    accept: [".png", "image/png"],
    mimeTypes: ["image/png"],
    extensions: [".png"],
    label: "PNG",
  },
  {
    type: "DOCX",
    accept: [
      ".doc",
      ".docx",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".doc", ".docx"],
    label: "Word",
  },
  {
    type: "PPTX",
    accept: [
      ".ppt",
      ".pptx",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    extensions: [".ppt", ".pptx"],
    label: "PPTX",
  },
  {
    type: "XLSX",
    accept: [
      ".xls",
      ".xlsx",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    extensions: [".xls", ".xlsx"],
    label: "Excel",
  },
  {
    type: "PDF",
    accept: [".pdf", "application/pdf"],
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
    label: "PDF",
  },
  {
    type: "MP3",
    accept: [".mp3", "audio/mpeg", "audio/mp3"],
    mimeTypes: ["audio/mpeg", "audio/mp3"],
    extensions: [".mp3"],
    label: "MP3",
  },
  {
    type: "MP4",
    accept: [".mp4", "video/mp4"],
    mimeTypes: ["video/mp4"],
    extensions: [".mp4"],
    label: "MP4",
  },
];

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
}

export function getAllowedUploadTypes(contentTypes: ContentType[]) {
  return contentTypes.filter((type) => type !== "Hyperlink");
}

export function getUploadAcceptValue(contentTypes: ContentType[]) {
  const allowedUploadTypes = getAllowedUploadTypes(contentTypes);
  const acceptValues = UPLOAD_DEFINITIONS.filter((definition) =>
    allowedUploadTypes.includes(definition.type),
  ).flatMap((definition) => definition.accept);

  return acceptValues.join(",");
}

export function getUploadLabels(contentTypes: ContentType[]) {
  return UPLOAD_DEFINITIONS.filter((definition) =>
    contentTypes.includes(definition.type),
  ).map((definition) => definition.label);
}

export function detectUploadContentType(file: Pick<File, "name" | "type">) {
  const fileType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  const match = UPLOAD_DEFINITIONS.find(
    (definition) =>
      definition.mimeTypes.includes(fileType) ||
      definition.extensions.includes(extension),
  );

  return match?.type ?? null;
}

export function buildStoragePath(options: {
  userId: string;
  repositoryId: number;
  fileName: string;
}) {
  const extension = getFileExtension(options.fileName);
  return `${options.userId}/${options.repositoryId}/${crypto.randomUUID()}${extension}`;
}

export function isImageUpload(itemType: ContentType) {
  return itemType === "JPG" || itemType === "PNG";
}

export function isAudioUpload(itemType: ContentType) {
  return itemType === "MP3";
}

export function isVideoUpload(itemType: ContentType) {
  return itemType === "MP4";
}

export function isPdfUpload(itemType: ContentType) {
  return itemType === "PDF";
}

export function isOfficeUpload(itemType: ContentType) {
  return itemType === "DOCX" || itemType === "PPTX" || itemType === "XLSX";
}

export function getUploadTypeLabel(itemType: ContentType) {
  const definition = UPLOAD_DEFINITIONS.find(
    (uploadDefinition) => uploadDefinition.type === itemType,
  );

  return definition?.label ?? itemType;
}
