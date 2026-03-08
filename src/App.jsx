import { useState, useEffect, useRef, useCallback } from "react";
<style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes spinSlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes flashGreen{0%{box-shadow:0 0 0 #00ffaa}50%{box-shadow:0 0 30px #00ffaa88}100%{box-shadow:0 0 0 #00ffaa}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#030a14}
        ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px}
      `}</style>
    </div>
  );
}
