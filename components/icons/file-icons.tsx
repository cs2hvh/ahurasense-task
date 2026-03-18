import { type SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function WordIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <rect x="3" y="2" width="26" height="28" rx="2" fill="#185ABD" />
      <rect x="8" y="6" width="20" height="22" rx="1" fill="#fff" />
      <rect x="1" y="7" width="16" height="18" rx="1.5" fill="#103F91" />
      <text x="9" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="11" fill="#fff">W</text>
      <rect x="11" y="10" width="14" height="1.5" rx="0.5" fill="#C8D8EC" />
      <rect x="11" y="14" width="14" height="1.5" rx="0.5" fill="#C8D8EC" />
      <rect x="11" y="18" width="10" height="1.5" rx="0.5" fill="#C8D8EC" />
      <rect x="11" y="22" width="12" height="1.5" rx="0.5" fill="#C8D8EC" />
    </svg>
  );
}

export function PowerPointIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <rect x="3" y="2" width="26" height="28" rx="2" fill="#C43E1C" />
      <rect x="8" y="6" width="20" height="22" rx="1" fill="#fff" />
      <rect x="1" y="7" width="16" height="18" rx="1.5" fill="#A33117" />
      <text x="9" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="11" fill="#fff">P</text>
      <rect x="14" y="10" width="10" height="8" rx="1" fill="#F4D3C6" />
      <rect x="12" y="21" width="13" height="1.5" rx="0.5" fill="#E0C5B8" />
      <rect x="12" y="24" width="9" height="1.5" rx="0.5" fill="#E0C5B8" />
    </svg>
  );
}

export function ExcelIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <rect x="3" y="2" width="26" height="28" rx="2" fill="#107C41" />
      <rect x="8" y="6" width="20" height="22" rx="1" fill="#fff" />
      <rect x="1" y="7" width="16" height="18" rx="1.5" fill="#0B5E2F" />
      <text x="9" y="20" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="11" fill="#fff">X</text>
      {/* Grid cells */}
      <rect x="11" y="9" width="6" height="4" rx="0.3" fill="#C8E6D0" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="17" y="9" width="6" height="4" rx="0.3" fill="#E8F5EC" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="23" y="9" width="4" height="4" rx="0.3" fill="#C8E6D0" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="11" y="13" width="6" height="4" rx="0.3" fill="#E8F5EC" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="17" y="13" width="6" height="4" rx="0.3" fill="#C8E6D0" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="23" y="13" width="4" height="4" rx="0.3" fill="#E8F5EC" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="11" y="17" width="6" height="4" rx="0.3" fill="#C8E6D0" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="17" y="17" width="6" height="4" rx="0.3" fill="#E8F5EC" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="23" y="17" width="4" height="4" rx="0.3" fill="#C8E6D0" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="11" y="21" width="6" height="4" rx="0.3" fill="#E8F5EC" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="17" y="21" width="6" height="4" rx="0.3" fill="#C8E6D0" stroke="#A3D4AF" strokeWidth="0.5" />
      <rect x="23" y="21" width="4" height="4" rx="0.3" fill="#E8F5EC" stroke="#A3D4AF" strokeWidth="0.5" />
    </svg>
  );
}

export function PdfIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <rect x="3" y="2" width="26" height="28" rx="2" fill="#E5252A" />
      <rect x="8" y="6" width="20" height="22" rx="1" fill="#fff" />
      <rect x="1" y="7" width="16" height="18" rx="1.5" fill="#B71C1C" />
      <text x="9" y="19.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" fill="#fff">PDF</text>
      <rect x="11" y="10" width="14" height="1.5" rx="0.5" fill="#F5C6C6" />
      <rect x="11" y="14" width="14" height="1.5" rx="0.5" fill="#F5C6C6" />
      <rect x="11" y="18" width="10" height="1.5" rx="0.5" fill="#F5C6C6" />
      <rect x="11" y="22" width="12" height="1.5" rx="0.5" fill="#F5C6C6" />
    </svg>
  );
}

export function TextFileIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      <rect x="3" y="2" width="26" height="28" rx="2" fill="#6B7280" />
      <rect x="8" y="6" width="20" height="22" rx="1" fill="#fff" />
      <rect x="1" y="7" width="16" height="18" rx="1.5" fill="#4B5563" />
      <text x="9" y="19.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="9" fill="#fff">TXT</text>
      <rect x="11" y="10" width="14" height="1.2" rx="0.5" fill="#D1D5DB" />
      <rect x="11" y="13" width="14" height="1.2" rx="0.5" fill="#D1D5DB" />
      <rect x="11" y="16" width="10" height="1.2" rx="0.5" fill="#D1D5DB" />
      <rect x="11" y="19" width="14" height="1.2" rx="0.5" fill="#D1D5DB" />
      <rect x="11" y="22" width="8" height="1.2" rx="0.5" fill="#D1D5DB" />
    </svg>
  );
}
