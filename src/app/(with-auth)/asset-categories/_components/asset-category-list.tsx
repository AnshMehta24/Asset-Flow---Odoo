import Link from "next/link";
import { PencilLine } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function AssetCategoryList({
  categories,
}: {
  categories: {
    id: string;
    name: string;
    description: string | null;
    customFields: {
      id: string;
    }[];
    _count: {
      assets: number;
    };
  }[];
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
      <div className="grid grid-cols-[minmax(200px,1.1fr)_minmax(0,1.6fr)_120px_120px_72px] gap-4 border-b border-border bg-muted px-5 py-4 text-sm font-medium text-foreground">
        <span>Category</span>
        <span>Description</span>
        <span>Fields</span>
        <span>Assets</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-border">
        {categories.length === 0 ? (
          <div className="px-5 py-12 text-sm text-muted-foreground">
            No categories found.
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="grid grid-cols-[minmax(200px,1.1fr)_minmax(0,1.6fr)_120px_120px_72px] items-center gap-4 px-5 py-4 text-sm"
            >
              <p className="truncate font-medium text-foreground">
                {category.name}
              </p>
              <p className="truncate text-muted-foreground">
                {category.description || "--"}
              </p>
              <p className="text-foreground">{category.customFields.length}</p>
              <p className="text-foreground">{category._count.assets}</p>
              <div className="flex justify-end">
                <Link
                  href={`/asset-categories/${category.id}/edit`}
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                  aria-label={`Edit ${category.name}`}
                >
                  <PencilLine className="size-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
