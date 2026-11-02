import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="StillYou home"
    >
      <svg
        width="30"
        height="32"
        viewBox="0 0 30 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M15 28V13M15 22C5 23 2 16 3 11C10 10 15 14 15 22ZM15 17C24 17 28 10 26 5C19 6 15 10 15 17ZM15 13C9 10 9 4 13 1C18 4 19 9 15 13Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        still<span className="brand-you">you</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
