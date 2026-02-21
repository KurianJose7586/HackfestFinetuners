"use client";

import Link from "next/link";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useEffect, useState } from "react";

const navItems = [
  { name: "Home", link: "/" },
  { name: "Features", link: "#features" },
  { name: "Pricing", link: "#pricing" },
];

function NavbarDemo() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 z-50 w-full">
      <Navbar className={`transition-all duration-300 ease-in-out ${scrolled ? "backdrop-blur-lg" : ""}`}>
        {/* Desktop Nav */}
        <NavBody>
          <NavbarLogo>
            <div className="flex items-center gap-2 text-white">
              <div className="h-6 w-6 rounded-lg bg-white/8 border border-white/14 flex items-center justify-center">
                <span className="text-sm font-bold">B</span>
              </div>
              <span className="text-lg font-bold">Beacon</span>
            </div>
          </NavbarLogo>

          <NavItems items={navItems} />

          <div className="flex items-center gap-4">
            <Link href="/login">
              <NavbarButton variant="secondary">Login</NavbarButton>
            </Link>
            <Link href="/register">
              <NavbarButton variant="primary">Get Started</NavbarButton>
            </Link>
          </div>
        </NavBody>

        {/* Mobile Nav */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo>
              <div className="flex items-center gap-2 text-white">
                <div className="h-6 w-6 rounded-lg bg-white/8 border border-white/14 flex items-center justify-center">
                  <span className="text-sm font-bold">B</span>
                </div>
                <span className="text-lg font-bold">Beacon</span>
              </div>
            </NavbarLogo>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-neutral-200 dark:text-white"
              >
                {item.name}
              </a>
            ))}
            <div className="flex w-full flex-col gap-4 pt-4">
              <Link href="/login" className="w-full">
                <NavbarButton
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="secondary"
                  className="w-full"
                >
                  Login
                </NavbarButton>
              </Link>
              <Link href="/register" className="w-full">
                <NavbarButton
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="primary"
                  className="w-full"
                >
                  Get Started
                </NavbarButton>
              </Link>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}

export default NavbarDemo;
