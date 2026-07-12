import type { ReactNode } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Image
          src="/assetflow.png"
          alt="AssetFlow"
          width={1536}
          height={1024}
          priority
          className="h-12 w-auto rounded-lg"
        />

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>

        {footer}
      </div>
    </div>
  );
}
