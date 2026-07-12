import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/user";
import { isCloudinaryConfigured, uploadAssetPhoto } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const user = await requireCurrentUser();

  if (!user || !["ADMIN", "ASSET_MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }

  const upload = await uploadAssetPhoto(file);

  return NextResponse.json({
    url: upload.secure_url,
    publicId: upload.public_id,
  });
}
