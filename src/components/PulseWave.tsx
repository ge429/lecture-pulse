"use client";

export default function PulseWave() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-30 flex items-center justify-center">
      <svg
        className="w-full h-48 md:h-64"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B61FF" />
            <stop offset="50%" stopColor="#45dfa4" />
            <stop offset="100%" stopColor="#7B61FF" />
          </linearGradient>
          <clipPath id="pulse-mask">
            <rect width="100%" height="100%" x="-100%" y="0">
              <animate attributeName="x" from="-100%" to="100%" dur="2.5s" repeatCount="indefinite" />
            </rect>
          </clipPath>
        </defs>
        {/* Faint static line */}
        <path
          d="M0 50 L100 50 L110 40 L120 60 L130 50 L250 50 L260 20 L275 80 L290 50 L400 50 L410 40 L420 60 L430 50 L550 50 L560 10 L580 90 L600 50 L750 50 L760 40 L770 60 L780 50 L900 50 L910 20 L925 80 L940 50 L1000 50"
          fill="none"
          stroke="#7B61FF"
          strokeWidth="1"
          opacity="0.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Animated scanning line */}
        <path
          d="M0 50 L100 50 L110 40 L120 60 L130 50 L250 50 L260 20 L275 80 L290 50 L400 50 L410 40 L420 60 L430 50 L550 50 L560 10 L580 90 L600 50 L750 50 L760 40 L770 60 L780 50 L900 50 L910 20 L925 80 L940 50 L1000 50"
          fill="none"
          stroke="url(#pulse-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath="url(#pulse-mask)"
        />
      </svg>
    </div>
  );
}
