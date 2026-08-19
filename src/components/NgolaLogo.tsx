import React from 'react';

interface NgolaLogoProps {
  className?: string;
  size?: number;
}

export const NgolaLogo: React.FC<NgolaLogoProps> = ({ className = 'w-10 h-10', size }) => {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <g stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Network Constellation Lines shaping Angola */}
        <path
          d="
            M120,70 L150,40 L180,50 L200,30 L220,50 L250,30 L280,60 L320,50 L350,70 L380,80 L400,100 L420,120 L440,150 
            L420,180 L400,210 L430,240 L460,250 L480,270 L460,300 L440,320 L420,350 L400,390 L410,430 L390,460 L360,480 
            L320,470 L280,490 L240,480 L200,490 L160,470 L130,450 L110,410 L120,370 L140,340 L160,310 L180,280 L160,250 
            L140,220 L130,190 L150,160 L140,130 L110,100 Z
          "
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeOpacity="0.85"
        />

        {/* Cabinda province top left */}
        <path
          d="M110,40 L130,20 L140,35 L120,55 Z"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
        />

        {/* Inner network connecting lines */}
        {/* Cabinda mesh */}
        <line x1="110" y1="40" x2="140" y2="35" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="130" y1="20" x2="120" y2="55" stroke="#3b82f6" strokeWidth="1.5" />

        {/* North/Center mesh */}
        <line x1="120" y1="70" x2="180" y2="50" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="150" y1="40" x2="200" y2="30" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="180" y1="50" x2="250" y2="30" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="200" y1="30" x2="220" y2="50" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="220" y1="50" x2="280" y2="60" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="250" y1="30" x2="320" y2="50" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="280" y1="60" x2="350" y2="70" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="320" y1="50" x2="380" y2="80" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="350" y1="70" x2="400" y2="100" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="380" y1="80" x2="420" y2="120" stroke="#3b82f6" strokeWidth="1.5" />

        <line x1="140" y1="130" x2="190" y2="110" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="190" y1="110" x2="240" y2="100" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="240" y1="100" x2="290" y2="110" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="290" y1="110" x2="350" y2="130" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="350" y1="130" x2="400" y2="160" stroke="#3b82f6" strokeWidth="1.5" />

        <line x1="120" y1="70" x2="140" y2="130" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="180" y1="50" x2="190" y2="110" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="220" y1="50" x2="240" y2="100" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="280" y1="60" x2="290" y2="110" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="350" y1="70" x2="350" y2="130" stroke="#3b82f6" strokeWidth="1.5" />

        {/* Coastal mesh */}
        <line x1="150" y1="160" x2="180" y2="180" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="130" y1="190" x2="170" y2="210" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="140" y1="220" x2="180" y2="240" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="160" y1="250" x2="190" y2="270" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="180" y1="280" x2="210" y2="300" stroke="#3b82f6" strokeWidth="1.5" />

        {/* East border mesh */}
        <line x1="400" y1="100" x2="400" y2="160" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="420" y1="120" x2="410" y2="190" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="440" y1="150" x2="420" y2="220" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="430" y1="240" x2="410" y2="280" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="460" y1="250" x2="420" y2="310" stroke="#3b82f6" strokeWidth="1.5" />

        {/* South mesh */}
        <line x1="160" y1="310" x2="200" y2="340" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="140" y1="340" x2="190" y2="380" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="120" y1="370" x2="180" y2="420" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="110" y1="410" x2="160" y2="450" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="130" y1="450" x2="200" y2="460" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="160" y1="470" x2="220" y2="450" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="200" y1="490" x2="260" y2="460" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="240" y1="480" x2="300" y2="460" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="280" y1="490" x2="340" y2="450" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="320" y1="470" x2="370" y2="440" stroke="#3b82f6" strokeWidth="1.5" />
        <line x1="360" y1="480" x2="390" y2="420" stroke="#3b82f6" strokeWidth="1.5" />

        {/* Constellation Nodes (Dots) */}
        {[
          [110,40], [130,20], [140,35], [120,55],
          [120,70], [150,40], [180,50], [200,30], [220,50], [250,30], [280,60], [320,50], [350,70], [380,80], [400,100], [420,120], [440,150],
          [140,130], [190,110], [240,100], [290,110], [350,130], [400,160], [420,180],
          [150,160], [180,180], [130,190], [170,210], [140,220], [180,240], [160,250], [190,270], [180,280], [210,300],
          [400,210], [430,240], [460,250], [480,270], [460,300], [440,320], [420,350], [400,390], [410,430], [390,460], [360,480],
          [160,310], [200,340], [140,340], [190,380], [120,370], [180,420], [110,410], [160,450], [130,450], [200,460], [160,470],
          [220,450], [200,490], [260,460], [240,480], [300,460], [280,490], [340,450], [320,470], [370,440]
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="#1e40af" stroke="#ffffff" strokeWidth="1" />
        ))}
      </g>

      {/* Central Book Icon with crisp vectors */}
      <g stroke="#1e3a8a" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Outer Backing Layer for crisp contrast */}
        <rect x="135" y="185" width="230" height="150" rx="20" fill="#ffffff" stroke="none" />

        {/* Left Outer Page */}
        <path d="M145,215 Q195,200 245,220 L245,315 Q195,295 145,310 Z" fill="#ffffff" />
        {/* Right Outer Page */}
        <path d="M355,215 Q305,200 255,220 L255,315 Q305,295 355,310 Z" fill="#ffffff" />

        {/* Book Spine Center */}
        <line x1="250" y1="218" x2="250" y2="318" stroke="#1e3a8a" strokeWidth="10" />

        {/* Left Main Page */}
        <path d="M155,222 Q198,208 245,225 L245,310 Q198,293 155,308 Z" fill="#ffffff" stroke="#1e3a8a" strokeWidth="10" />

        {/* Right Main Page */}
        <path d="M345,222 Q302,208 255,225 L255,310 Q302,293 345,308 Z" fill="#ffffff" stroke="#1e3a8a" strokeWidth="10" />
      </g>

      {/* Vector 'N' on left page */}
      <text
        x="192"
        y="280"
        fill="#1e3a8a"
        fontSize="58"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        textAnchor="middle"
      >
        N
      </text>

      {/* Vector 'T' on right page */}
      <text
        x="302"
        y="280"
        fill="#1e3a8a"
        fontSize="58"
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        textAnchor="middle"
      >
        T
      </text>
    </svg>
  );
};
