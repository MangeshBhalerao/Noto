import React from "react";
import Link from "next/link";

export default function Header() {
    return (
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
            <div className="flex items-center gap-4">
            <div className="w-6 h-6 text-[#36c3f2]">
                <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_6_330)">
                    <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"></path>
                </g>
                <defs>
                    <clipPath id="clip0_6_330"><rect fill="white" height="48" width="48"></rect></clipPath>
                </defs>
                </svg>
            </div>
            <h2 className="text-xl font-bold">Noto</h2>
            </div>
            <div children="flex gap-6"> 
                <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                    Home
                </Link>
                <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
                    About
                </Link>
            </div>
        </header>
    );
}