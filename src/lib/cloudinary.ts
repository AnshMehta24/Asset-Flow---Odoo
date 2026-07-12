import { createHash } from "crypto";

type UploadOptions = {
  folder: string;
  publicId?: string;
  overwrite?: boolean;
};

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig() !== null;
}

function buildSignature(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.entries(params)
    .filter(([, value]) => value.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary(file: File, options: UploadOptions) {
  const config = getCloudinaryConfig();

  if (!config) {
    throw new Error("Cloudinary is not configured.");
  }

  const timestamp = `${Math.floor(Date.now() / 1000)}`;
  const signatureParams: Record<string, string> = {
    folder: options.folder,
    timestamp,
  };

  if (options.publicId) {
    signatureParams.public_id = options.publicId;
  }

  if (options.overwrite) {
    signatureParams.overwrite = "true";
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("api_key", config.apiKey);
  formData.set("folder", options.folder);
  formData.set("timestamp", timestamp);

  if (options.publicId) {
    formData.set("public_id", options.publicId);
  }

  if (options.overwrite) {
    formData.set("overwrite", "true");
  }

  formData.set("signature", buildSignature(signatureParams, config.apiSecret));

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudinary upload failed: ${body}`);
  }

  return (await response.json()) as CloudinaryUploadResult;
}

export async function uploadAssetPhoto(file: File) {
  return uploadToCloudinary(file, {
    folder: "asset-flow/assets/photos",
  });
}

export async function generateAndUploadAssetQrCode(payload: string, assetId: string) {
  const qrResponse = await fetch(
    `https://quickchart.io/qr?size=600&margin=1&text=${encodeURIComponent(payload)}`
  );

  if (!qrResponse.ok) {
    throw new Error("Failed to generate asset QR code.");
  }

  const qrBlob = await qrResponse.blob();
  const qrFile = new File([qrBlob], `${assetId}.png`, { type: "image/png" });

  return uploadToCloudinary(qrFile, {
    folder: "asset-flow/assets/qrcodes",
    publicId: `asset-${assetId}`,
    overwrite: true,
  });
}
