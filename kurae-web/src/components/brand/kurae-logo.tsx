import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type KuraeLogoProps = {
  className?: string;
  priority?: boolean;
};

export function KuraeLogo({ className, priority = false }: KuraeLogoProps) {
  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="Kurae home"
    >
      <Image
        src="/kurae-logo.png"
        alt="Kurae"
        width={140}
        height={40}
        className="h-8 w-auto"
        priority={priority}
      />
    </Link>
  );
}
