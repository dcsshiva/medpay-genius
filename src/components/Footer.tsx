import React from "react";
import { cn } from "@/lib/utils";

interface FooterProps {
  variant?: "default" | "light";
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ variant = "default", className }) => {
  return (
    <footer
      className={cn(
        "w-full border-t py-4",
        variant === "light" ? "bg-white/10 backdrop-blur-sm border-white/20" : "bg-card",
        className,
      )}
    >
      <div className="container px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
          <span className={variant === "light" ? "text-white/90" : "text-muted-foreground"}>
            Copyright © 2025–2045 Yazhini Infotech, Pondicherry. All rights reserved.
          </span>
          <span className={cn("hidden sm:inline", variant === "light" ? "text-white/70" : "text-muted-foreground")}>
            |
          </span>
          <span className={variant === "light" ? "text-white/90" : "text-muted-foreground"}>📞</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
